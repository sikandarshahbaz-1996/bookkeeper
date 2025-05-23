import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css'; // Import react-toastify CSS
import { ToastContainer } from 'react-toastify'; // Import ToastContainer
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer"; // Import Footer
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext"; // Import ThemeProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BookKeeper",
  description: "Generated by Sikandar Shahbaz",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <ToastContainer 
              position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light" // or "dark" or "colored"
          />
          <Navbar />
          {/* paddingTop is to offset fixed Navbar. Background color will be inherited or set by globals.css */}
          <main style={{ paddingTop: '70px' }}> 
            {children}
          </main>
          <Footer /> {/* Add Footer here */}
        </AuthProvider>
      </ThemeProvider>
      </body>
    </html>
  );
}
