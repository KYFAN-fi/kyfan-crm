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

  if (phone.length === 9) {
    phone = "0" + phone;
  }

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

  if (s.includes("đã nhắn")) {
    return "Đã nhắn";
  }

  if (s.includes("đã làm việc")) {
    return "Đã làm việc";
  }

  if (s.includes("đã gọi")) {
    return "Đã gọi";
  }

  if (s.includes("cần gọi lại")) {
    return "Cần gọi lại";
  }

  if (s.includes("tiềm năng")) {
    return "Khách tiềm năng";
  }

  if (s.includes("quan tâm")) {
    return "Khách quan tâm";
  }

  if (s.includes("không phù hợp")) {
    return "Không phù hợp";
  }

  if (s.includes("đã chốt")) {
    return "Đã chốt";
  }

  if (s.includes("đã hủy") || s.includes("đã huỷ")) {
    return "Đã hủy";
  }

  return status;
}

module.exports = {
  cleanText,
  normalizePhone,
  normalizeStatus,
};