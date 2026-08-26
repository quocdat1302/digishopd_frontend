import { apiClient } from "./client";

export const pickupLocationApi = {
  getActiveLocations: () => apiClient.get("/pickup-locations").then((r) => r.data),

  // ---- Admin ----
  getAllForAdmin: () => apiClient.get("/pickup-locations/admin").then((r) => r.data),

  create: (payload) => apiClient.post("/pickup-locations/admin", payload).then((r) => r.data),

  update: (id, payload) => apiClient.put(`/pickup-locations/admin/${id}`, payload).then((r) => r.data),

  remove: (id) => apiClient.delete(`/pickup-locations/admin/${id}`),
};