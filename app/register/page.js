import { redirect } from "next/navigation";

export const metadata = {
  title: "참가자 등록 | 공도2 출석 이벤트"
};

export default function RegisterPage() {
  redirect("/#flow");
}
