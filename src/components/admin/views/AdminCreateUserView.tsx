"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/T";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export function AdminCreateUserView() {
  const t = useT();

  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="text-sm text-snow/50 transition hover:text-snow"
      >
        {t.admin.backUsers}
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-snow">
        {t.admin.createUserTitle}
      </h1>
      <p className="mt-2 text-snow/60">{t.admin.createUserLead}</p>
      <CreateUserForm />
    </div>
  );
}
