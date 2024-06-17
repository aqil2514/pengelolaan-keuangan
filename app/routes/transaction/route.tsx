import { LoaderFunctionArgs, MetaFunction, json } from "@remix-run/node";
import TransactionMenu from "./transaction-menu";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import TransactionNavbar from "./transaction-navbar";
import TransactionData from "./data";
import { ClientOnly } from "remix-utils/client-only";
import React, { createContext, useContext, useState } from "react";
import TransactionFilter from "./transaction-filter";
import { authenticator } from "~/service/auth.server";
import Loading from "components/Loading/Loading";
import { getUser } from "utils/account";
import { getTransPerAssetData, getTransactionData } from "./utils";
import Button from "components/Inputs/Button";

export const meta: MetaFunction = () => [
  {
    title: "Transaksi | Moneyku",
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
  menuActive: boolean;
  month: number;
  year: number;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteMode: React.Dispatch<React.SetStateAction<boolean>>;
  setMenuActive: React.Dispatch<React.SetStateAction<boolean>>;
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

    const url = new URL(request.url);
    const { searchParams } = url;
    const assetFilter = searchParams.get("asset");

    const user = await getUser(request);

    if(!user) throw new Error("Terjadi kesalahan saat mengambil data user");

    if (assetFilter) {
      // Jika ada filter aset, dapatkan data transaksi berdasarkan aset tertentu
      const data = await getTransPerAssetData(user, assetFilter);

      if (data.status === 500) {
        return json({ data: data.data, user, filterData: assetFilter }, { status: data.status });
      } else if (!data.success) {
        return json({ data: [], user, filterData: assetFilter });
      }

      return json({ data: data.data, user, filterData: assetFilter });
    }

    const data = await getTransactionData(user);

    if (data.status === 500) {
      return json({ data: data.data, user, filterData: "" }, { status: data.status });
    } else if (!data.success) {
      return json({ data: [], user, filterData: "" });
    }

    return json({ data: data.data, user, filterData: "" });
  };

const TransactionContext = createContext<TransactionContextType>(
  {} as TransactionContextType
);

export default function Transaction() {
  const res = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isPending = navigation.state === "loading";

  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [menuActive, setMenuActive] = useState<boolean>(false);
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const data = res.data as TransactionType[];
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
              menuActive,
              setMenuActive,
            }}
          >
            {isPending && <Loading />}

            <div id="transaction" className="main-page">
              <h1 className="font-playfair-bold title-page">Transaksi</h1>

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
            menuActive,
            setMenuActive,
          }}
        >
          {isPending && <Loading />}
          <div id="transaction" className="main-page">
            <h1 className="font-playfair-bold title-page">{res.filterData ? `${res.filterData}` : "Transaksi"}</h1>

            <TransactionNavbar price={allPrices} />

            <header className="flex gap-1 items-center">
              <TransactionFilter />
              {res.filterData && (
                <Form action="/transaction" replace>
                  <Button color="error">Hapus filter asset</Button>
                </Form>
              )}
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
