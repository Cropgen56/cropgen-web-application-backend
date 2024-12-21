import axios from "axios";
export const getUserDataFromGoogle = async (accessToken) => {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching user info from Google:", error);
    throw new Error("Failed to fetch user info");
  }
};
