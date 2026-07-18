import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("./services/hotelService", () => ({
  getHotels: vi.fn().mockResolvedValue({ data: { data: { hotels: [] } } }),
  getHotelById: vi.fn().mockResolvedValue({ data: { data: { hotel: null } } }),
}));

import App from "./App";
import AdminDashboard from "./pages/admin/AdminDashboard";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

test("renders the home hero on the landing page", async () => {
  render(<App />);
  expect(await screen.findByText(/Your Perfect Stay/i)).toBeInTheDocument();
});

test("loads the admin dashboard module without crashing", () => {
  expect(AdminDashboard).toBeDefined();
});
