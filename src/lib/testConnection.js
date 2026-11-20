import { supabase } from "./supabase";

export async function testConnection() {
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*");

  if (error) {
    console.error("Supabase connection failed:", error);
    return;
  }

  console.log("Supabase connected successfully!");
  console.log("Categories:", data);
}