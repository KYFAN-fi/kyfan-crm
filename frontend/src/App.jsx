import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  FileSpreadsheet,
  Filter,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { customerApi, dashboardApi } from "./api";
import { SERVICE_OPTIONS, STATUS_OPTIONS, getStatusClass } from "./constants";

const emptyForm = {
  customerName: "",
  socialContact: "",
  phone: "",
  province: "",
  serviceType: "Vay thế chấp",
  demandNote: "",
  processingStatus: "Chưa gọi",
  note: "",
};

const TEXT_LIMITS = {
  customerName: 120,
  socialContact: 120,
  province: 120,
  demandNote: 1000,
  note: 1000,
};

const STATUS_REQUIRING_CONFIRM = new Set([
  "Không phù hợp",
  "Thuê bao / khóa sim",
  "Đã hủy",
]);

function cleanInput(value) {
  return String(value ?? "").trim();
}

function normalizePhone(value) {
  let phone = cleanInput(value);

  phone = phone.replace(/\.0$/, "");
  phone = phone.replace(/[^\d]/g, "");

  if (!phone) return "";

  if (phone.length === 9) {
    phone = `0${phone}`;
  }

  if (phone.startsWith("84") && phone.length >= 11) {
    phone = `0${phone.slice(2)}`;
  }

  return phone;
}

function validateTextLength(errors, field, label, value) {
  const limit = TEXT_LIMITS[field];

  if (limit && cleanInput(value).length > limit) {
    errors[field] = `${label} không được vượt quá ${limit} ký tự.`;
  }
}

function validateCustomerForm(values) {
  const errors = {};
  const normalizedPhone = normalizePhone(values.phone);
  const normalizedForm = {
    customerName: cleanInput(values.customerName),
    socialContact: cleanInput(values.socialContact),
    phone: normalizedPhone,
    province: cleanInput(values.province),
    serviceType: cleanInput(values.serviceType),
    demandNote: cleanInput(values.demandNote),
    processingStatus: cleanInput(values.processingStatus),
    note: cleanInput(values.note),
  };

  if (!normalizedForm.customerName) {
    errors.customerName = "Tên khách hàng là bắt buộc.";
  } else if (normalizedForm.customerName.length < 2) {
    errors.customerName = "Tên khách hàng cần ít nhất 2 ký tự.";
  }

  if (!normalizedForm.phone) {
    errors.phone = "Số điện thoại là bắt buộc.";
  } else if (!/^0\d{9,10}$/.test(normalizedPhone)) {
    errors.phone =
      "Số điện thoại cần có 10 hoặc 11 chữ số sau chuẩn hóa, bắt đầu bằng 0.";
  }

  if (!SERVICE_OPTIONS.includes(normalizedForm.serviceType)) {
    errors.serviceType = "Chọn một loại dịch vụ hợp lệ.";
  }

  if (!STATUS_OPTIONS.includes(normalizedForm.processingStatus)) {
    errors.processingStatus = "Chọn một trạng thái hợp lệ.";
  }

  validateTextLength(errors, "customerName", "Tên khách hàng", normalizedForm.customerName);
  validateTextLength(errors, "socialContact", "Zalo/Facebook", normalizedForm.socialContact);
  validateTextLength(errors, "province", "Khu vực", normalizedForm.province);
  validateTextLength(errors, "demandNote", "Nhu cầu", normalizedForm.demandNote);
  validateTextLength(errors, "note", "Ghi chú", normalizedForm.note);

  return {
    errors,
    normalizedForm,
  };
}

function getApiMessage(err, fallback) {
  return err?.response?.data?.message || fallback;
}

function App() {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusStats, setStatusStats] = useState([]);
  const [serviceStats, setServiceStats] = useState([]);
  const [provinceStats, setProvinceStats] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());

  const [keyword, setKeyword] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [province, setProvince] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState("");

  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [lastUpdated, setLastUpdated] = useState(null);
  const toastTimerRef = useRef(null);

  const currentFilters = useMemo(
    () => ({
      keyword,
      serviceType,
      processingStatus,
      province,
    }),
    [keyword, serviceType, processingStatus, province]
  );

  const hasFilters = useMemo(
    () => Object.values(currentFilters).some((value) => cleanInput(value)),
    [currentFilters]
  );

  const hasFormChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm]
  );

  const localStats = useMemo(() => {
    return {
      total: customers.length,
      chuaGoi: customers.filter((c) => c.processingStatus === "Chưa gọi").length,
    };
  }, [customers]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message, type = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  };

  const fetchCustomers = async (filters = currentFilters) => {
    try {
      setLoading(true);
      setError("");

      const res = await customerApi.getAll({
        keyword: cleanInput(filters.keyword) || undefined,
        serviceType: cleanInput(filters.serviceType) || undefined,
        processingStatus: cleanInput(filters.processingStatus) || undefined,
        province: cleanInput(filters.province) || undefined,
        page: 1,
        limit: 200,
      });

      setCustomers(res.data.data || []);
    } catch (err) {
      setError(
        getApiMessage(
          err,
          "Không lấy được dữ liệu khách hàng. Hãy kiểm tra backend."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const [summaryRes, statusRes, serviceRes, provinceRes] =
        await Promise.all([
          dashboardApi.summary(),
          dashboardApi.byStatus(),
          dashboardApi.byService(),
          dashboardApi.byProvince(),
        ]);

      setSummary(summaryRes.data.data || null);
      setStatusStats(statusRes.data.data || []);
      setServiceStats(serviceRes.data.data || []);
      setProvinceStats(provinceRes.data.data || []);
    } catch (err) {
      setError(getApiMessage(err, "Không lấy được dữ liệu dashboard."));
    }
  };

  const refreshAll = async (filters = currentFilters) => {
    await Promise.all([fetchCustomers(filters), fetchDashboard()]);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshAll();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestConfirm = (config) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        cancelLabel: "Hủy",
        confirmLabel: "Xác nhận",
        tone: "default",
        ...config,
        resolve,
      });
    });
  };

  const closeConfirm = (result) => {
    if (confirmDialog?.resolve) {
      confirmDialog.resolve(result);
    }

    setConfirmDialog(null);
  };

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setInitialForm(emptyForm);
    setFormErrors({});
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (customer) => {
    const nextForm = {
      customerName: customer.customerName || "",
      socialContact: customer.socialContact || "",
      phone: customer.phone || "",
      province: customer.province || "",
      serviceType: customer.serviceType || "Vay thế chấp",
      demandNote: customer.demandNote || "",
      processingStatus: customer.processingStatus || "Chưa gọi",
      note: customer.note || "",
    };

    setEditingCustomer(customer);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFormErrors({});
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = async ({ force = false } = {}) => {
    if (!force && hasFormChanges && !saving) {
      const ok = await requestConfirm({
        title: "Bỏ thay đổi?",
        description:
          "Các thông tin đang nhập chưa được lưu. Bạn có chắc muốn đóng form?",
        confirmLabel: "Bỏ thay đổi",
        cancelLabel: "Tiếp tục nhập",
        tone: "danger",
      });

      if (!ok) return;
    }

    setModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
    setInitialForm(emptyForm);
    setFormErrors({});
    setFormError("");
  };

  const resetForm = async () => {
    if (hasFormChanges) {
      const ok = await requestConfirm({
        title: "Nhập lại form?",
        description: editingCustomer
          ? "Form sẽ quay về dữ liệu ban đầu của khách hàng này."
          : "Toàn bộ thông tin đang nhập sẽ được xóa khỏi form.",
        confirmLabel: "Nhập lại",
        cancelLabel: "Giữ nguyên",
        tone: "danger",
      });

      if (!ok) return;
    }

    setForm(initialForm);
    setFormErrors({});
    setFormError("");
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setFormErrors((prev) => {
      if (!prev[field]) return prev;

      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { errors, normalizedForm } = validateCustomerForm(form);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormError("Kiểm tra lại các trường đang báo lỗi trước khi lưu.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      if (editingCustomer) {
        await customerApi.update(editingCustomer.id, normalizedForm);
        showToast("Cập nhật khách hàng thành công");
      } else {
        await customerApi.create(normalizedForm);
        showToast("Thêm khách hàng thành công");
      }

      await closeModal({ force: true });
      await refreshAll();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {};
      const message = getApiMessage(
        err,
        "Có lỗi xảy ra khi lưu khách hàng. Kiểm tra lại dữ liệu."
      );

      setFormErrors(apiErrors);
      setFormError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const setRowBusy = (customerId, busy) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);

      if (busy) {
        next.add(customerId);
      } else {
        next.delete(customerId);
      }

      return next;
    });
  };

  const handleDelete = async (customer) => {
    const label = customer.customerName || customer.phone || `ID #${customer.id}`;
    const ok = await requestConfirm({
      title: "Xóa khách hàng?",
      description: `Khách "${label}" sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.`,
      confirmLabel: "Xóa khách",
      cancelLabel: "Giữ lại",
      tone: "danger",
    });

    if (!ok) return;

    try {
      setRowBusy(customer.id, true);
      await customerApi.delete(customer.id);
      showToast("Xóa khách hàng thành công");
      await refreshAll();
    } catch (err) {
      showToast(getApiMessage(err, "Xóa khách hàng thất bại"), "error");
    } finally {
      setRowBusy(customer.id, false);
    }
  };

  const handleQuickStatus = async (customer, status) => {
    if (status === customer.processingStatus) return;

    if (STATUS_REQUIRING_CONFIRM.has(status)) {
      const ok = await requestConfirm({
        title: "Đổi trạng thái?",
        description: `Chuyển khách "${
          customer.customerName || customer.phone || `ID #${customer.id}`
        }" sang trạng thái "${status}"?`,
        confirmLabel: "Cập nhật",
        cancelLabel: "Giữ trạng thái cũ",
        tone: "danger",
      });

      if (!ok) return;
    }

    try {
      setRowBusy(customer.id, true);
      await customerApi.updateStatus(customer.id, {
        processingStatus: status,
        note: customer.note,
      });

      showToast("Cập nhật trạng thái thành công");
      await refreshAll();
    } catch (err) {
      showToast(getApiMessage(err, "Cập nhật trạng thái thất bại"), "error");
    } finally {
      setRowBusy(customer.id, false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    fetchCustomers();
  };

  const clearFilters = () => {
    const emptyFilters = {
      keyword: "",
      serviceType: "",
      processingStatus: "",
      province: "",
    };

    setKeyword("");
    setServiceType("");
    setProcessingStatus("");
    setProvince("");
    fetchCustomers(emptyFilters);
  };

  const callCustomer = (phone) => {
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      showToast("Khách hàng chưa có số điện thoại", "error");
      return;
    }

    if (!/^0\d{9,10}$/.test(normalizedPhone)) {
      showToast("Số điện thoại không hợp lệ để gọi", "error");
      return;
    }

    window.location.assign(`tel:${normalizedPhone}`);
  };

  const renderFieldError = (field) => {
    if (!formErrors[field]) return null;

    return <span className="field-error">{formErrors[field]}</span>;
  };

  return (
    <div className="app-shell">
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div>
            <div className="brand-name">KYFAN CRM</div>
            <div className="brand-sub">Financial Data Manager</div>
          </div>
        </div>

        <nav className="nav" aria-label="Điều hướng chính">
          <button
            className={`nav-item ${activeSection === "dashboard" ? "active" : ""}`}
            type="button"
            onClick={() => scrollToSection("dashboard")}
          >
            <BarChart3 size={18} />
            Dashboard
          </button>
          <button
            className={`nav-item ${activeSection === "customers" ? "active" : ""}`}
            type="button"
            onClick={() => scrollToSection("customers")}
          >
            <Users size={18} />
            Khách hàng
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => showToast("Import Excel đang dùng script backend.", "info")}
          >
            <FileSpreadsheet size={18} />
            Import Excel
          </button>
        </nav>
      </aside>

      <main className="main">
        <header className="header" id="dashboard">
          <div>
            <p className="eyebrow">Quản lý data khách hàng</p>
            <h1>CRM tài chính nội bộ KYFAN</h1>
            <p className="header-desc">
              Theo dõi khách hàng, trạng thái xử lý, dịch vụ và phân tích dữ
              liệu theo thời gian thực.
            </p>
          </div>

          <div className="header-actions">
            <button
              className="btn btn-light"
              type="button"
              onClick={() => refreshAll()}
              disabled={loading || saving}
            >
              {loading ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <RefreshCw size={17} />
              )}
              {loading ? "Đang tải" : "Làm mới"}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={openCreateModal}
              disabled={saving}
            >
              <Plus size={17} />
              Thêm khách
            </button>
          </div>
        </header>

        <section className="kpi-grid" aria-label="Chỉ số tổng quan">
          <KpiCard
            icon={<Users />}
            label="Tổng khách"
            value={summary?.totalCustomers ?? localStats.total}
            hint="Tổng data trong hệ thống"
          />
          <KpiCard
            icon={<CircleDollarSign />}
            label="Vay thế chấp"
            value={summary?.vayTheChap ?? 0}
            hint="Nhóm khách vay thế chấp"
          />
          <KpiCard
            icon={<CheckCircle2 />}
            label="Đã xử lý"
            value={summary?.processedTotal ?? 0}
            hint={`${summary?.processedRate ?? 0}% tổng data`}
          />
          <KpiCard
            icon={<Phone />}
            label="Chưa gọi"
            value={summary?.chuaGoi ?? localStats.chuaGoi}
            hint="Cần ưu tiên xử lý"
          />
        </section>

        <section className="analytics-grid" aria-label="Biểu đồ phân tích">
          <ChartCard
            title="Theo trạng thái"
            data={statusStats}
            labelKey="processingStatus"
          />
          <ChartCard title="Theo dịch vụ" data={serviceStats} labelKey="serviceType" />
          <ChartCard
            title="Top khu vực"
            data={provinceStats.slice(0, 6)}
            labelKey="province"
          />
        </section>

        <section className="panel" id="customers">
          <div className="panel-head">
            <div>
              <h2>Danh sách khách hàng</h2>
              <p>Hiển thị {customers.length} khách theo bộ lọc hiện tại.</p>
            </div>
            {lastUpdated && (
              <span className="panel-meta">
                Cập nhật {lastUpdated.toLocaleTimeString("vi-VN")}
              </span>
            )}
          </div>

          <form className="filters" onSubmit={handleSearch}>
            <div className="search-box">
              <Search size={18} />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm tên, SĐT, Zalo/Facebook, ghi chú..."
              />
            </div>

            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              disabled={loading}
            >
              <option value="">Tất cả dịch vụ</option>
              {SERVICE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={processingStatus}
              onChange={(e) => setProcessingStatus(e.target.value)}
              disabled={loading}
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="Khu vực"
              disabled={loading}
            />

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={16} /> : <Filter size={16} />}
              Lọc
            </button>

            <button
              className="btn btn-light"
              type="button"
              onClick={clearFilters}
              disabled={loading || !hasFilters}
            >
              <X size={16} />
              Xóa lọc
            </button>
          </form>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Khu vực</th>
                  <th>Dịch vụ</th>
                  <th>Nhu cầu</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="center-cell">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="center-cell">
                      Không có khách hàng phù hợp
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const rowBusy = updatingIds.has(customer.id);

                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="customer-name">
                            {customer.customerName || "Chưa có tên"}
                          </div>
                          <div className="small">ID #{customer.id}</div>
                        </td>
                        <td>
                          <div className="phone">{customer.phone || "-"}</div>
                          <div className="small">
                            {customer.socialContact || "Chưa có Zalo/Facebook"}
                          </div>
                        </td>
                        <td>{customer.province || "-"}</td>
                        <td>
                          <span className="service-pill">
                            {customer.serviceType || "-"}
                          </span>
                        </td>
                        <td className="note-cell">{customer.demandNote || "-"}</td>
                        <td>
                          <select
                            className={`status-select ${getStatusClass(
                              customer.processingStatus
                            )}`}
                            value={customer.processingStatus || "Chưa gọi"}
                            onChange={(e) =>
                              handleQuickStatus(customer, e.target.value)
                            }
                            disabled={rowBusy}
                          >
                            {STATUS_OPTIONS.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="note-cell">{customer.note || "-"}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              type="button"
                              onClick={() => callCustomer(customer.phone)}
                              title="Gọi"
                              disabled={rowBusy}
                            >
                              <Phone size={16} />
                            </button>
                            <button
                              className="icon-btn"
                              type="button"
                              onClick={() => openEditModal(customer)}
                              title="Sửa"
                              disabled={rowBusy}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              className="icon-btn danger"
                              type="button"
                              onClick={() => handleDelete(customer)}
                              title="Xóa"
                              disabled={rowBusy}
                            >
                              {rowBusy ? (
                                <Loader2 className="spin" size={16} />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {loading ? (
              <div className="center-cell">Đang tải dữ liệu...</div>
            ) : customers.length === 0 ? (
              <div className="center-cell">Không có khách hàng phù hợp</div>
            ) : (
              customers.map((customer) => {
                const rowBusy = updatingIds.has(customer.id);

                return (
                  <article className="customer-card" key={customer.id}>
                    <div className="card-top">
                      <div>
                        <h3>{customer.customerName || "Chưa có tên"}</h3>
                        <p>{customer.phone || "Chưa có số điện thoại"}</p>
                      </div>
                      <span
                        className={`status-badge ${getStatusClass(
                          customer.processingStatus
                        )}`}
                      >
                        {customer.processingStatus || "Chưa gọi"}
                      </span>
                    </div>

                    <div className="card-info">
                      <div>
                        <span>Dịch vụ</span>
                        <strong>{customer.serviceType || "-"}</strong>
                      </div>
                      <div>
                        <span>Khu vực</span>
                        <strong>{customer.province || "-"}</strong>
                      </div>
                      <div>
                        <span>Nhu cầu</span>
                        <strong>{customer.demandNote || "-"}</strong>
                      </div>
                      <div>
                        <span>Ghi chú</span>
                        <strong>{customer.note || "-"}</strong>
                      </div>
                    </div>

                    <select
                      className={`status-select ${getStatusClass(
                        customer.processingStatus
                      )}`}
                      value={customer.processingStatus || "Chưa gọi"}
                      onChange={(e) => handleQuickStatus(customer, e.target.value)}
                      disabled={rowBusy}
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <div className="card-actions">
                      <button
                        type="button"
                        onClick={() => callCustomer(customer.phone)}
                        disabled={rowBusy}
                      >
                        <Phone size={16} />
                        Gọi
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        disabled={rowBusy}
                      >
                        <Edit3 size={16} />
                        Sửa
                      </button>
                      <button
                        className="danger-text"
                        type="button"
                        onClick={() => handleDelete(customer)}
                        disabled={rowBusy}
                      >
                        {rowBusy ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Xóa
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <div>
                <h2>
                  {editingCustomer ? "Sửa khách hàng" : "Thêm khách hàng"}
                </h2>
                <p>Nhập thông tin khách hàng để lưu vào database Supabase.</p>
              </div>
              <button className="close-btn" type="button" onClick={() => closeModal()}>
                <X size={20} />
              </button>
            </div>

            <form className="customer-form" onSubmit={handleSubmit} noValidate>
              {formError && <div className="form-error">{formError}</div>}

              <div className="form-grid">
                <label className={formErrors.customerName ? "has-error" : ""}>
                  <span>Tên khách hàng *</span>
                  <input
                    value={form.customerName}
                    onChange={(e) => handleChange("customerName", e.target.value)}
                    aria-invalid={Boolean(formErrors.customerName)}
                    autoComplete="name"
                    maxLength={TEXT_LIMITS.customerName}
                  />
                  {renderFieldError("customerName")}
                </label>

                <label className={formErrors.phone ? "has-error" : ""}>
                  <span>Số điện thoại *</span>
                  <input
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    aria-invalid={Boolean(formErrors.phone)}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="0901234567"
                  />
                  {renderFieldError("phone")}
                </label>

                <label className={formErrors.socialContact ? "has-error" : ""}>
                  <span>Zalo/Facebook</span>
                  <input
                    value={form.socialContact}
                    onChange={(e) => handleChange("socialContact", e.target.value)}
                    aria-invalid={Boolean(formErrors.socialContact)}
                    maxLength={TEXT_LIMITS.socialContact}
                  />
                  {renderFieldError("socialContact")}
                </label>

                <label className={formErrors.province ? "has-error" : ""}>
                  <span>Khu vực</span>
                  <input
                    value={form.province}
                    onChange={(e) => handleChange("province", e.target.value)}
                    aria-invalid={Boolean(formErrors.province)}
                    maxLength={TEXT_LIMITS.province}
                  />
                  {renderFieldError("province")}
                </label>

                <label className={formErrors.serviceType ? "has-error" : ""}>
                  <span>Loại dịch vụ *</span>
                  <select
                    value={form.serviceType}
                    onChange={(e) => handleChange("serviceType", e.target.value)}
                    aria-invalid={Boolean(formErrors.serviceType)}
                  >
                    {SERVICE_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {renderFieldError("serviceType")}
                </label>

                <label className={formErrors.processingStatus ? "has-error" : ""}>
                  <span>Trạng thái</span>
                  <select
                    value={form.processingStatus}
                    onChange={(e) =>
                      handleChange("processingStatus", e.target.value)
                    }
                    aria-invalid={Boolean(formErrors.processingStatus)}
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {renderFieldError("processingStatus")}
                </label>
              </div>

              <label className={formErrors.demandNote ? "has-error" : ""}>
                <span>Nhu cầu / tình trạng khách</span>
                <textarea
                  rows="3"
                  value={form.demandNote}
                  onChange={(e) => handleChange("demandNote", e.target.value)}
                  aria-invalid={Boolean(formErrors.demandNote)}
                  maxLength={TEXT_LIMITS.demandNote}
                />
                {renderFieldError("demandNote")}
              </label>

              <label className={formErrors.note ? "has-error" : ""}>
                <span>Ghi chú</span>
                <textarea
                  rows="3"
                  value={form.note}
                  onChange={(e) => handleChange("note", e.target.value)}
                  aria-invalid={Boolean(formErrors.note)}
                  maxLength={TEXT_LIMITS.note}
                />
                {renderFieldError("note")}
              </label>

              <div className="modal-actions">
                <button
                  className="btn btn-light"
                  type="button"
                  onClick={() => closeModal()}
                  disabled={saving}
                >
                  <X size={16} />
                  Hủy
                </button>
                <button
                  className="btn btn-light"
                  type="button"
                  onClick={resetForm}
                  disabled={saving || !hasFormChanges}
                >
                  <RotateCcw size={16} />
                  Nhập lại
                </button>
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                  {saving ? "Đang lưu..." : "Lưu khách hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        dialog={confirmDialog}
        onCancel={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
      />
    </div>
  );
}

function KpiCard({ icon, label, value, hint }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{hint}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, data, labelKey }) {
  const max = Math.max(...data.map((item) => item.total || 0), 1);

  return (
    <div className="chart-card">
      <h3>{title}</h3>

      <div className="mini-chart">
        {data.length === 0 ? (
          <p className="small">Chưa có dữ liệu</p>
        ) : (
          data.slice(0, 8).map((item, index) => {
            const percent = Math.max(((item.total || 0) / max) * 100, 5);

            return (
              <div className="bar-row" key={`${item[labelKey]}-${index}`}>
                <span>{item[labelKey] || "Khác"}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${percent}%` }} />
                </div>
                <strong>{item.total}</strong>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ConfirmDialog({ dialog, onCancel, onConfirm }) {
  if (!dialog) return null;

  const isDanger = dialog.tone === "danger";

  return (
    <div className="modal-backdrop confirm-backdrop">
      <div className="confirm-dialog" role="dialog" aria-modal="true">
        <div className={`confirm-icon ${isDanger ? "danger" : ""}`}>
          <AlertTriangle size={22} />
        </div>

        <div className="confirm-copy">
          <h2>{dialog.title}</h2>
          <p>{dialog.description}</p>
        </div>

        <div className="confirm-actions">
          <button className="btn btn-light" type="button" onClick={onCancel}>
            {dialog.cancelLabel}
          </button>
          <button
            className={`btn ${isDanger ? "btn-danger" : "btn-primary"}`}
            type="button"
            onClick={onConfirm}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
