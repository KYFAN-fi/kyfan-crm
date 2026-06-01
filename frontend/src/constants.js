export const STATUS_OPTIONS = [
  "Chưa gọi",
  "Đã gọi",
  "Đã nhắn",
  "Chưa nghe máy",
  "Đã làm việc",
  "Cần gọi lại",
  "Khách quan tâm",
  "Khách tiềm năng",
  "Không phù hợp",
  "Thuê bao / khóa sim",
  "Đã chốt",
  "Đã hủy",
];

export const SERVICE_OPTIONS = [
  "Vay thế chấp",
  "Nâng hạn mức",
  "Đáo hạn khoản vay",
  "Hồ sơ khó",
  "Khác",
];

export const STATUS_COLOR = {
  "Chưa gọi": "status-gray",
  "Đã gọi": "status-blue",
  "Đã nhắn": "status-purple",
  "Chưa nghe máy": "status-orange",
  "Đã làm việc": "status-green",
  "Cần gọi lại": "status-yellow",
  "Khách quan tâm": "status-green",
  "Khách tiềm năng": "status-teal",
  "Không phù hợp": "status-red",
  "Thuê bao / khóa sim": "status-slate",
  "Đã chốt": "status-emerald",
  "Đã hủy": "status-red",
};

export function getStatusClass(status) {
  return STATUS_COLOR[status] || "status-gray";
}