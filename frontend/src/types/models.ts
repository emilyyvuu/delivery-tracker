export type UserRole = "CUSTOMER" | "DRIVER";

export type OrderStatus = "CREATED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";

export type Order = {
  id: string;
  status: OrderStatus;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  created_at: string;
};
