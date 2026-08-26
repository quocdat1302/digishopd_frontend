import { apiClient } from "./client";

export const reportApi = {
  getRevenueReport: (from, to, type) =>
    apiClient.get("/admin/reports/revenue", { params: { from, to, type } }).then((r) => r.data),

  getWeeklyRevenue: () => apiClient.get("/admin/reports/revenue/weekly").then((r) => r.data),

  getTopRentedProducts: (from, to, limit = 10) =>
    apiClient.get("/admin/reports/top-rented-products", { params: { from, to, limit } }).then((r) => r.data),

  getDamagedDevices: (from, to) =>
    apiClient.get("/admin/reports/damaged-devices", { params: { from, to } }).then((r) => r.data),

  getOverdueRentals: () => apiClient.get("/admin/reports/overdue-rentals").then((r) => r.data),
};