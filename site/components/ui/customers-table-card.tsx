"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const MESCHAC_AVATAR = "https://avatars.githubusercontent.com/u/47919550?v=4";
const BERNARD_AVATAR = "https://avatars.githubusercontent.com/u/31113941?v=4";
const THEO_AVATAR = "https://avatars.githubusercontent.com/u/68236786?v=4";
const GLODIE_AVATAR = "https://avatars.githubusercontent.com/u/99137927?v=4";

export type Customer = {
  id: number | string;
  date: string;
  status: "Paid" | "Cancelled" | "Ref";
  statusVariant: "success" | "danger" | "warning";
  name: string;
  avatar: string;
  revenue: string;
};

export type CustomersTableCardProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  customers?: Customer[];
};

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 1,
    date: "10/31/2023",
    status: "Paid",
    statusVariant: "success",
    name: "Bernard Ng",
    avatar: BERNARD_AVATAR,
    revenue: "$43.99",
  },
  {
    id: 2,
    date: "10/21/2023",
    status: "Ref",
    statusVariant: "warning",
    name: "Méschac Irung",
    avatar: MESCHAC_AVATAR,
    revenue: "$19.99",
  },
  {
    id: 3,
    date: "10/15/2023",
    status: "Paid",
    statusVariant: "success",
    name: "Glodie Ng",
    avatar: GLODIE_AVATAR,
    revenue: "$99.99",
  },
  {
    id: 4,
    date: "10/12/2023",
    status: "Cancelled",
    statusVariant: "danger",
    name: "Theo Ng",
    avatar: THEO_AVATAR,
    revenue: "$19.99",
  },
];

const Badge = ({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "success" | "danger" | "warning";
}) => {
  const styles =
    variant === "success"
      ? "bg-lime-500/15 text-lime-300"
      : variant === "danger"
        ? "bg-red-500/15 text-red-300"
        : "bg-yellow-500/15 text-yellow-300";

  return <span className={cn("rounded-full px-2 py-1 text-xs font-medium", styles)}>{children}</span>;
};

export default function CustomersTableCard({
  title = "Customers",
  subtitle = "New users by First user primary channel group (Default Channel Group)",
  customers = DEFAULT_CUSTOMERS,
  className,
}: CustomersTableCardProps) {
  return (
    <section
      className={cn(
        "relative w-full overflow-hidden rounded-[32px] border border-white/10 bg-black/45 text-white shadow-2xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-xl",
        className,
      )}
      aria-label={title}
    >
      <div className="space-y-3 border-b border-white/10 p-6">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-white/10 bg-white/20" />
          <span className="size-2 rounded-full border border-white/10 bg-white/20" />
          <span className="size-2 rounded-full border border-white/10 bg-white/20" />
        </div>
        <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
        <p className="text-sm text-white/55">{subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white/5 backdrop-blur-sm">
            <tr className="text-white/55 *:px-3 *:py-3 *:text-left *:font-medium">
              <th className="w-12">#</th>
              <th className="min-w-[120px]">Date</th>
              <th className="min-w-[120px]">Status</th>
              <th className="min-w-[220px]">Customer</th>
              <th className="min-w-[120px] pr-4 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, idx) => (
              <tr
                key={customer.id}
                className="border-b border-white/10 transition-colors last:border-0 hover:bg-white/[0.04] *:px-3 *:py-3"
              >
                <td className="text-white/45">{idx + 1}</td>
                <td className="whitespace-nowrap text-white/80">{customer.date}</td>
                <td>
                  <Badge variant={customer.statusVariant}>{customer.status}</Badge>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="size-7 overflow-hidden rounded-full ring-1 ring-white/15">
                      <img
                        src={customer.avatar}
                        alt={customer.name}
                        width={28}
                        height={28}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </div>
                    <span className="truncate font-medium text-white">{customer.name}</span>
                  </div>
                </td>
                <td className="pr-4 text-right font-medium tabular-nums text-white">{customer.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 p-4 text-xs text-white/50">
        <span>
          Showing <strong className="text-white/75">{customers.length}</strong>{" "}
          {customers.length === 1 ? "row" : "rows"}
        </span>
        <span>Updated just now</span>
      </div>
    </section>
  );
}
