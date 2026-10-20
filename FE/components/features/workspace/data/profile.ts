import { workspaceFacility } from "./workspace";

export type WorkspaceProfile = {
  name: string; type: "Clinic" | "Hospital"; description: string;
  address: string; city: string; state: string; postalCode: string;
  phone: string; email: string; hours: string; services: string[];
};

// Fictional public profile. Contact fields are intentionally empty until edited.
export const initialWorkspaceProfile: WorkspaceProfile = {
  name: workspaceFacility.name, type: workspaceFacility.type,
  description: workspaceFacility.description, address: "12 Meadow Arcade, Navrangpura",
  city: "Ahmedabad", state: "Gujarat", postalCode: "380009",
  phone: "", email: "", hours: workspaceFacility.hours,
  services: [...workspaceFacility.specialties],
};
