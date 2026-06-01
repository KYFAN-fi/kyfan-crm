const prisma = require("../config/prisma");
const { SERVICE_OPTIONS, STATUS_OPTIONS } = require("../constants/customer-options");
const { cleanText, normalizePhone, normalizeStatus } = require("../utils/normalize");

const PHONE_PATTERN = /^0\d{9,10}$/;
const TEXT_LIMITS = {
  customerName: 120,
  socialContact: 120,
  province: 120,
  demandNote: 1000,
  note: 1000,
};

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

function sendValidationError(res, errors, message = "Dữ liệu không hợp lệ") {
  return res.status(400).json({
    success: false,
    message,
    errors,
  });
}

function parseCustomerId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function addTextField({ body, data, errors, field, label, required = false }) {
  if (!hasOwn(body, field)) {
    if (required) {
      errors[field] = `${label} là bắt buộc`;
    }

    return;
  }

  const value = cleanText(body[field]);
  const limit = TEXT_LIMITS[field];

  if (required && !value) {
    errors[field] = `${label} là bắt buộc`;
  } else if (field === "customerName" && value && value.length < 2) {
    errors[field] = "Tên khách hàng cần ít nhất 2 ký tự";
  } else if (value && limit && value.length > limit) {
    errors[field] = `${label} không được vượt quá ${limit} ký tự`;
  }

  data[field] = value;
}

function addPhoneField({ body, data, errors, required = false }) {
  if (!hasOwn(body, "phone")) {
    if (required) {
      errors.phone = "Số điện thoại là bắt buộc";
    }

    return;
  }

  const phone = normalizePhone(body.phone);

  if (required && !phone) {
    errors.phone = "Số điện thoại là bắt buộc";
  } else if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone =
      "Số điện thoại cần có 10 hoặc 11 chữ số sau chuẩn hóa, bắt đầu bằng 0";
  }

  data.phone = phone;
}

function addServiceTypeField({ body, data, errors, required = false }) {
  if (!hasOwn(body, "serviceType")) {
    if (required) {
      errors.serviceType = "Loại dịch vụ là bắt buộc";
    }

    return;
  }

  const serviceType = cleanText(body.serviceType);

  if (required && !serviceType) {
    errors.serviceType = "Loại dịch vụ là bắt buộc";
  } else if (serviceType && !SERVICE_OPTIONS.includes(serviceType)) {
    errors.serviceType = "Loại dịch vụ không hợp lệ";
  }

  data.serviceType = serviceType;
}

function addStatusField({ body, data, errors, partial = false }) {
  if (!hasOwn(body, "processingStatus")) {
    if (!partial) {
      data.processingStatus = "Chưa gọi";
    }

    return;
  }

  const rawStatus = cleanText(body.processingStatus);

  if (!rawStatus) {
    if (partial) {
      errors.processingStatus = "Trạng thái xử lý là bắt buộc";
      return;
    }

    data.processingStatus = "Chưa gọi";
    return;
  }

  const status = normalizeStatus(rawStatus);

  if (!STATUS_OPTIONS.includes(status)) {
    errors.processingStatus = "Trạng thái xử lý không hợp lệ";
  }

  data.processingStatus = status;
}

function validateCustomerPayload(body, { partial = false } = {}) {
  const errors = {};
  const data = {};

  addTextField({
    body,
    data,
    errors,
    field: "customerName",
    label: "Tên khách hàng",
    required: !partial || hasOwn(body, "customerName"),
  });
  addPhoneField({
    body,
    data,
    errors,
    required: !partial || hasOwn(body, "phone"),
  });
  addTextField({
    body,
    data,
    errors,
    field: "socialContact",
    label: "Zalo/Facebook",
  });
  addTextField({
    body,
    data,
    errors,
    field: "province",
    label: "Khu vực",
  });
  addServiceTypeField({
    body,
    data,
    errors,
    required: !partial || hasOwn(body, "serviceType"),
  });
  addStatusField({ body, data, errors, partial });
  addTextField({
    body,
    data,
    errors,
    field: "demandNote",
    label: "Nhu cầu",
  });
  addTextField({
    body,
    data,
    errors,
    field: "note",
    label: "Ghi chú",
  });

  return { data, errors };
}

function buildCustomerWhere(query) {
  const keyword = cleanText(query.keyword);
  const serviceType = cleanText(query.serviceType);
  const processingStatus = cleanText(query.processingStatus);
  const province = cleanText(query.province);
  const phone = normalizePhone(query.phone);
  const conditions = [];

  if (keyword) {
    conditions.push({
      OR: [
        {
          customerName: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          socialContact: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          demandNote: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          note: {
            contains: keyword,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (serviceType) {
    conditions.push({
      serviceType,
    });
  }

  if (processingStatus) {
    conditions.push({
      processingStatus,
    });
  }

  if (province) {
    conditions.push({
      province: {
        contains: province,
        mode: "insensitive",
      },
    });
  }

  if (phone) {
    conditions.push({
      phone: {
        contains: phone,
      },
    });
  }

  return conditions.length ? { AND: conditions } : {};
}

async function getCustomers(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 200);
    const skip = (page - 1) * limit;
    const where = buildCustomerWhere(req.query);

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return res.json({
      success: true,
      message: "Lấy danh sách khách hàng thành công",
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách khách hàng",
      error: error.message,
    });
  }
}

async function getCustomerById(req, res) {
  try {
    const id = parseCustomerId(req.params.id);

    if (!id) {
      return sendValidationError(res, { id: "ID khách hàng không hợp lệ" });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    return res.json({
      success: true,
      message: "Lấy chi tiết khách hàng thành công",
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy chi tiết khách hàng",
      error: error.message,
    });
  }
}

async function createCustomer(req, res) {
  try {
    const { data, errors } = validateCustomerPayload(req.body);

    if (hasErrors(errors)) {
      return sendValidationError(res, errors);
    }

    const existedPhone = await prisma.customer.findFirst({
      where: {
        phone: data.phone,
      },
    });

    if (existedPhone) {
      return res.status(409).json({
        success: false,
        message: "Số điện thoại đã tồn tại trong hệ thống",
        errors: {
          phone: "Số điện thoại đã tồn tại trong hệ thống",
        },
        data: existedPhone,
      });
    }

    const customer = await prisma.customer.create({
      data: {
        ...data,
        source: "Manual",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Thêm khách hàng thành công",
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thêm khách hàng",
      error: error.message,
    });
  }
}

async function updateCustomer(req, res) {
  try {
    const id = parseCustomerId(req.params.id);

    if (!id) {
      return sendValidationError(res, { id: "ID khách hàng không hợp lệ" });
    }

    const existedCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    const { data, errors } = validateCustomerPayload(req.body, { partial: true });

    if (hasErrors(errors)) {
      return sendValidationError(res, errors);
    }

    if (Object.keys(data).length === 0) {
      return sendValidationError(res, {
        payload: "Không có dữ liệu cần cập nhật",
      });
    }

    if (data.phone) {
      const duplicatedPhone = await prisma.customer.findFirst({
        where: {
          phone: data.phone,
          NOT: {
            id,
          },
        },
      });

      if (duplicatedPhone) {
        return res.status(409).json({
          success: false,
          message: "Số điện thoại đã thuộc về khách hàng khác",
          errors: {
            phone: "Số điện thoại đã thuộc về khách hàng khác",
          },
          data: duplicatedPhone,
        });
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      message: "Cập nhật khách hàng thành công",
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật khách hàng",
      error: error.message,
    });
  }
}

async function updateCustomerStatus(req, res) {
  try {
    const id = parseCustomerId(req.params.id);
    const { processingStatus, note } = req.body;

    if (!id) {
      return sendValidationError(res, { id: "ID khách hàng không hợp lệ" });
    }

    const status = cleanText(processingStatus);

    if (!status) {
      return sendValidationError(res, {
        processingStatus: "Trạng thái xử lý là bắt buộc",
      });
    }

    const normalizedStatus = normalizeStatus(status);

    if (!STATUS_OPTIONS.includes(normalizedStatus)) {
      return sendValidationError(res, {
        processingStatus: "Trạng thái xử lý không hợp lệ",
      });
    }

    const cleanedNote = note !== undefined ? cleanText(note) : undefined;

    if (cleanedNote && cleanedNote.length > TEXT_LIMITS.note) {
      return sendValidationError(res, {
        note: `Ghi chú không được vượt quá ${TEXT_LIMITS.note} ký tự`,
      });
    }

    const existedCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        processingStatus: normalizedStatus,
        ...(note !== undefined && { note: cleanedNote }),
      },
    });

    return res.json({
      success: true,
      message: "Cập nhật trạng thái khách hàng thành công",
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật trạng thái khách hàng",
      error: error.message,
    });
  }
}

async function deleteCustomer(req, res) {
  try {
    const id = parseCustomerId(req.params.id);

    if (!id) {
      return sendValidationError(res, { id: "ID khách hàng không hợp lệ" });
    }

    const existedCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    await prisma.customer.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Xóa khách hàng thành công",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa khách hàng",
      error: error.message,
    });
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  deleteCustomer,
};
