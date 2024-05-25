import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
  json,
} from "@remix-run/node";
import TransactionMenu from "./transaction-menu";
import { useLoaderData } from "@remix-run/react";
import TransactionNavbar from "./transaction-navbar";
import TransactionData from "./data";
import serverEndpoint from "lib/server";
import { ClientOnly } from "remix-utils/client-only";
import React, { createContext, useContext, useState } from "react";
import TransactionFilter from "./transaction-filter";
import { authenticator } from "~/service/auth.server";
import { getSession } from "~/service/session.server";
import { AccountDB } from "~/@types/account";

export const meta: MetaFunction = () => [
  {
    title: "Transaksi | Money Management",
  },
];

export interface TransactionBodyType {
  uid: string;
  category: string;
  asset: string;
  item: string;
  price: number;
}

export interface TransactionType {
  id?: string;
  header: string;
  body: TransactionBodyType[];
}

interface TransactionContextType {
  editMode: boolean;
  deleteMode: boolean;
  month: number;
  year: number;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteMode: React.Dispatch<React.SetStateAction<boolean>>;
  setMonth: React.Dispatch<React.SetStateAction<number>>;
  setYear: React.Dispatch<React.SetStateAction<number>>;
  data: TransactionType[];
}

export const currencyFormat = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const session = await getSession(request.headers.get("cookie"));
  const user: AccountDB = session.get(authenticator.sessionKey);

  try {
    const isLocal = process.env.NODE_ENV === "development";
    const endpoint = isLocal ? serverEndpoint.local : serverEndpoint.production;

    const res = await fetch(`${endpoint}/transaction`, {
      headers: { "User-ID": String(user.uid) },
    });

    const resData = await res.json();

    if (!resData.success) {
      return json({ data: [], user });
    }

    let data: TransactionType | TransactionType[] = [];

    if (Array.isArray(resData.data)) data = resData.data;
    else data.push(resData.data);

    return json({ data, user });
  } catch (error) {
    console.error("Failed to fetch data:", error);
    return json({ data: "Failed to fetch data", user: null }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const method = request.method;
  const formData = await request.formData();
  if (method === "DELETE") {
    const header = formData.get("header");
    const index = formData.get("index");

    const res = await fetch(`${serverEndpoint.production}/transaction`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        header,
        index,
      }),
    });

    const data = await res.json();

    return json(data);
  }
};

const TransactionContext = createContext<TransactionContextType>(
  {} as TransactionContextType
);

export default function Transaction() {
  const res = useLoaderData<typeof loader>();
  console.log(res);

  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const data = res.data as TransactionType[];
  console.log(data);
  const selectedData = data.filter(
    (d) => new Date(d.header).getMonth() === month
  );

  const noPrice = [0];

  if (!data || data.length === 0)
    return (
      <ClientOnly>
        {() => (
          <TransactionContext.Provider
            value={{
              data,
              editMode,
              setEditMode,
              deleteMode,
              setDeleteMode,
              month,
              setMonth,
              year,
              setYear,
            }}
          >
            <div id="transaction" className="main-page">
              <h1>Transaksi</h1>

              <TransactionNavbar price={noPrice} />

              <main>
                <p style={{ textAlign: "center" }}>
                  Belum ada transaksi. Ayo tambahkan
                </p>
              </main>

              <TransactionMenu />
            </div>
          </TransactionContext.Provider>
        )}
      </ClientOnly>
    );

  const allBody = selectedData.map((d) => d.body);

  const allPrices = allBody
    .map((d) => d.map((x) => x.price))
    .join(",")
    .split(",")
    .map((d) => parseInt(d));

  return (
    <ClientOnly>
      {() => (
        <TransactionContext.Provider
          value={{
            data,
            editMode,
            setEditMode,
            deleteMode,
            setDeleteMode,
            month,
            setMonth,
            year,
            setYear,
          }}
        >
          <div id="transaction" className="main-page">
            <h1>Transaksi</h1>

            <TransactionNavbar price={allPrices} />

            <header>
              <TransactionFilter />
            </header>

            <main id="transaction-data">
              <TransactionData />
            </main>

            <TransactionMenu />
          </div>
        </TransactionContext.Provider>
      )}
    </ClientOnly>
  );

  return <></>;
}

export function useTransactionData() {
  return useContext(TransactionContext);
}
