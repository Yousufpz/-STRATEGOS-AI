import { Inter, Cinzel } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

export const metadata = {
  title: "Strategos AI — The 48 Laws of Power Oracle",
  description: "Consult the ultimate strategic chamber. Leverage AI semantic retrieval to navigate complex human relationships and workplace dynamics using The 48 Laws of Power.",
  keywords: ["Strategos AI", "48 Laws of Power", "Strategic Advice", "RAG Oracle", "Semantic Search", "Qdrant", "Ollama"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable}`}>
      <body>
        <div className="grid-overlay" />
        <div className="light-sphere sphere-gold" />
        <div className="light-sphere sphere-cyan" />
        {children}
      </body>
    </html>
  );
}
