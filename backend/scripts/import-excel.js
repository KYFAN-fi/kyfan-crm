require("dotenv").config();

const path = require("path");
const XLSX = require("xlsx");
const prisma = require("../src/config/prisma");

const filePath =
  process.argv[2] ||
  path.join(__dirname, "../data/data-khach-tai-chinh-2026.xlsx");

const SHEET_SERVICE_MAP = {
  "Vay thế chấp-2026": "Vay thế chấp",
  "Nâng hạn mức-2026": "Nâng hạn mức",
};

function cleanText(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();

  if (!text || text === "-" || text.toLowerCase() === "nan") {
    return null;
  }

  return text;
}

function normalizePhone(value) {
  if (value === undefined || value === null) return null;

  let phone = String(value).trim();

  phone = phone.replace(/\.0$/, "");
  phone = phone.replace(/[^\d]/g, "");

  if (!phone) return null;

  // Excel đang lưu nhiều số điện thoại bị mất số 0 đầu, ví dụ 988150778
  if (phone.length === 9) {
    phone = "0" + phone;
  }

  // Nếu dạng 84xxxxxxxxx thì chuyển về 0xxxxxxxxx
  if (phone.startsWith("84") && phone.length >= 11) {
    phone = "0" + phone.slice(2);
  }

  return phone;
}

function normalizeStatus(value) {
  const status = cleanText(value);

  if (!status) return "Chưa gọi";

  const s = status.toLowerCase();

  if (s.includes("thuê bao") || s.includes("khoá sim") || s.includes("khóa sim")) {
    return "Thuê bao / khóa sim";
  }

  if (s.includes("chưa nghe")) {
    return "Chưa nghe máy";
  }

  if (s.includes("chưa gọi")) {
    return "Chưa gọi";
  }

  if (s.includes("đã nhắn") || s.includes("da nhan")) {
    return "Đã nhắn";
  }

  if (s.includes("đã làm việc")) {
    return "Đã làm việc";
  }

  if (s.includes("đã gọi")) {
    return "Đã gọi";
  }

  return status;
}

function readCustomersFromExcel() {
  const workbook = XLSX.readFile(filePath);
  const customers = [];

  for (const sheetName of workbook.SheetNames) {
    const serviceType = SHEET_SERVICE_MAP[sheetName];

    if (!serviceType) {
      console.log(`Bỏ qua sheet: ${sheetName}`);
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    // File của bạn:
    // Row 0: tên dịch vụ
    // Row 1: header
    // Row 2 trở đi: data khách hàng
    const dataRows = rows.slice(2);

    for (const row of dataRows) {
      const stt = cleanText(row[0]);
      const customerName = cleanText(row[1]);
      const socialContact = cleanText(row[2]);
      const phone = normalizePhone(row[3]);
      const province = cleanText(row[4]);
      const demandNote = cleanText(row[5]);
      const processingStatus = normalizeStatus(row[6]);
      const note = cleanText(row[7]);

      const isEmptyRow =
        !stt &&
        !customerName &&
        !socialContact &&
        !phone &&
        !province &&
        !demandNote &&
        !note;

      if (isEmptyRow) continue;

      customers.push({
        customerName,
        socialContact,
        phone,
        province,
        serviceType,
        demandNote,
        processingStatus,
        note,
        source: "Excel Import 2026",
      });
    }
  }

  return customers;
}

async function main() {
  console.log("Đang đọc file Excel...");
  console.log("File:", filePath);

  const customers = readCustomersFromExcel();

  if (!customers.length) {
    console.log("Không có dữ liệu hợp lệ để import.");
    return;
  }

  const vayTheChapCount = customers.filter(
    (item) => item.serviceType === "Vay thế chấp"
  ).length;

  const nangHanMucCount = customers.filter(
    (item) => item.serviceType === "Nâng hạn mức"
  ).length;

  console.log("Dữ liệu đọc được:");
  console.log(`- Vay thế chấp: ${vayTheChapCount}`);
  console.log(`- Nâng hạn mức: ${nangHanMucCount}`);
  console.log(`- Tổng: ${customers.length}`);

  console.log("Đang xóa dữ liệu import cũ nếu có...");

  await prisma.customer.deleteMany({
    where: {
      source: "Excel Import 2026",
    },
  });

  console.log("Đang import dữ liệu mới...");

  await prisma.customer.createMany({
    data: customers,
  });

  const totalAfterImport = await prisma.customer.count();

  console.log("Import thành công.");
  console.log(`Tổng số khách trong database hiện tại: ${totalAfterImport}`);
}

main()
  .catch((error) => {
    console.error("Import thất bại:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });