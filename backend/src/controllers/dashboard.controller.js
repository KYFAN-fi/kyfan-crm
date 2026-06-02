const prisma = require("../config/prisma");

async function getDashboardSummary(req, res) {
  try {
    const [
      totalCustomers,
      vayTheChap,
      nangHanMuc,
      chuaGoi,
      daGoi,
      daNhan,
      chuaNgheMay,
      daLamViec,
      khachTiemNang,
      daChot,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { serviceType: "Vay thế chấp" } }),
      prisma.customer.count({ where: { serviceType: "Nâng hạn mức" } }),
      prisma.customer.count({ where: { processingStatus: "Chưa gọi" } }),
      prisma.customer.count({ where: { processingStatus: "Đã gọi" } }),
      prisma.customer.count({ where: { processingStatus: "Đã nhắn" } }),
      prisma.customer.count({ where: { processingStatus: "Chưa nghe máy" } }),
      prisma.customer.count({ where: { processingStatus: "Đã làm việc" } }),
      prisma.customer.count({ where: { processingStatus: "Khách tiềm năng" } }),
      prisma.customer.count({ where: { processingStatus: "Đã chốt" } }),
    ]);

    const processedTotal =
      daGoi + daNhan + chuaNgheMay + daLamViec + khachTiemNang + daChot;

    const processedRate =
      totalCustomers > 0
        ? Number(((processedTotal / totalCustomers) * 100).toFixed(2))
        : 0;

    return res.json({
      success: true,
      message: "Lấy dashboard summary thành công",
      data: {
        totalCustomers,
        vayTheChap,
        nangHanMuc,
        chuaGoi,
        daGoi,
        daNhan,
        chuaNgheMay,
        daLamViec,
        khachTiemNang,
        daChot,
        processedTotal,
        processedRate,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy dashboard summary",
      error: error.message,
    });
  }
}

async function getByStatus(req, res) {
  try {
    const data = await prisma.customer.groupBy({
      by: ["processingStatus"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    return res.json({
      success: true,
      message: "Thống kê theo trạng thái thành công",
      data: data.map((item) => ({
        processingStatus: item.processingStatus || "Chưa có trạng thái",
        total: item._count.id,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thống kê theo trạng thái",
      error: error.message,
    });
  }
}

async function getByService(req, res) {
  try {
    const data = await prisma.customer.groupBy({
      by: ["serviceType"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    return res.json({
      success: true,
      message: "Thống kê theo dịch vụ thành công",
      data: data.map((item) => ({
        serviceType: item.serviceType || "Chưa có dịch vụ",
        total: item._count.id,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thống kê theo dịch vụ",
      error: error.message,
    });
  }
}

async function getByProvince(req, res) {
  try {
    const data = await prisma.customer.groupBy({
      by: ["province"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 20,
    });

    return res.json({
      success: true,
      message: "Thống kê theo khu vực thành công",
      data: data.map((item) => ({
        province: item.province || "Chưa có khu vực",
        total: item._count.id,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thống kê theo khu vực",
      error: error.message,
    });
  }
}

module.exports = {
  getDashboardSummary,
  getByStatus,
  getByService,
  getByProvince,
}; 