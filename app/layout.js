import "./globals.css";

export const metadata = {
  title: "공도2 출석 이벤트",
  description: "공도2 리뉴얼 기념 출석 이벤트 웹사이트"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
