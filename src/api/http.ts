import axios from "axios";
import * as vscode from "vscode";

export async function fetchData(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    vscode.window.showErrorMessage("Error fetching data: " + error);
    throw error;
  }
}