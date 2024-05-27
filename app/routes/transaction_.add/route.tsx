import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
  json,
  redirect,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { ClientOnly } from "remix-utils/client-only";
import Transaction from "./Transaction";
import serverEndpoint from "lib/server";
import { authenticator } from "~/service/auth.server";
import { getSession } from "~/service/session.server";
import { AccountDB } from "~/@types/account";
import { useState } from "react";
import { currencyFormat } from "../transaction/route";

export const meta: MetaFunction = () => [
  { title: "Tambah Transaksi | Money Management" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
};

interface ErrorsTransaction {
  type: string;
  total: string;
  date: string;
  category: string;
  asset: string;
  note: string;
}

interface ErrorIssue {
  code: string;
  expected: string;
  minimum: number;
  inclusive: boolean;
  exact: false;
  received: string;
  path: string[];
  message: string;
}

// SOON : Tambahin UX Untuk memberitahu user tentang hasil dari penambahan transaksi

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("cookie"));
  const user: AccountDB = session.get(authenticator.sessionKey);

  const formData = await request.formData();
  const typeTransaction = String(formData.get("type-data"));
  const totalTransaction = Number(formData.get("transaction-total"));
  const dateTransaction = new Date(String(formData.get("transaction-date")));
  const categoryTransaction = String(formData.get("transaction-category"));
  const assetsTransaction = String(formData.get("transaction-assets"));
  const noteTransaction = String(formData.get("transaction-note"));
  const price =
    typeTransaction === "Pemasukan" ? totalTransaction : totalTransaction * -1;

  const isLocal = process.env.NODE_ENV === "development";
  const endpoint = isLocal ? serverEndpoint.local : serverEndpoint.production;

  const res = await fetch(`${endpoint}/transaction/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      typeTransaction,
      totalTransaction,
      dateTransaction,
      categoryTransaction,
      assetsTransaction,
      noteTransaction,
      price,
      userId: user.uid,
    }),
  });

  if (res.status === 422) {
    const data = await res.json();
    const issues: ErrorIssue[] = data.error.issues;

    const errors: ErrorsTransaction = {
      date: issues.find((p) => p.path[0].includes("date"))?.message as string,
      total: issues.find((p) => p.path[0].includes("price"))?.message as string,
      type: issues.find((p) => p.path[0].includes("type"))?.message as string,
      category: issues.find((p) => p.path[0].includes("category"))
        ?.message as string,
      asset: issues.find((p) => p.path[0].includes("assets"))
        ?.message as string,
      note: issues.find((p) => p.path[0].includes("note"))?.message as string,
    };

    return json({ errors });
  }

  const data = await res.json();

  if (res.status === 200) {
    return redirect("/transaction");
  }

  return json({ data });
}

// TODO: FIx UI
export default function AddTransaction() {
  return <ClientOnly>{() => <Transaction />}</ClientOnly>;
}

export function IncomeTransaction() {
  const [nominal, setNominal] = useState<string>("");
  const actionData = useActionData<typeof action>();
  let errors: ErrorsTransaction = {} as ErrorsTransaction;

  if (actionData && "errors" in actionData) {
    errors = actionData.errors;
  }

  return (
    <div className="main-page">
      <Form
        className="form-basic"
        action="/transaction/add?type=Pemasukan"
        method="post"
      >
        <input type="hidden" name="type-data" value={"Pemasukan"} />
        <div className="form-date">
          <label htmlFor="transaction-date">Tanggal Transaksi</label>
          <input type="date" name="transaction-date" id="transaction-date" />
        </div>
        <em style={{ color: "red" }}>{errors?.date ? errors.date : null}</em>
        <div className="form-text">
          <label htmlFor="transaction-total">Nominal</label>
          <input
            type="number"
            value={nominal}
            onChange={(e) => {
              setNominal(e.target.value);
            }}
            name="transaction-total"
            id="transaction-total"
          />
          <p>
            <strong>Jumlah dalam Rupiah : </strong>
            {currencyFormat.format(Number(nominal))}
          </p>
          <em style={{ color: "red" }}>
            {errors?.total ? errors.total : null}
          </em>
        </div>
        <div className="form-text">
          <label htmlFor="transaction-category">Kategori Pemasukan</label>
          <input
            type="text"
            name="transaction-category"
            id="transaction-category"
          />
        </div>
        <em style={{ color: "red" }}>
          {errors?.category ? errors?.category : null}
        </em>
        <div className="form-text">
          <label htmlFor="transaction-assets">Aset</label>
          <input
            type="text"
            name="transaction-assets"
            id="transaction-assets"
          />
        </div>
        <em style={{ color: "red" }}>{errors?.asset ? errors?.asset : null}</em>
        <div className="form-text">
          <label htmlFor="transaction-note">Catatan</label>
          <input type="text" name="transaction-note" id="transaction-note" />
        </div>
        <em style={{ color: "red" }}>{errors?.note ? errors?.note : null}</em>
        <div>
          <button className="form-submit">Tambah Pemasukan</button>
        </div>
      </Form>
    </div>
  );
}

export function OutcomeTransaction() {
  const [nominal, setNominal] = useState<string>("");

  const actionData = useActionData<typeof action>();
  let errors: ErrorsTransaction = {} as ErrorsTransaction;

  if (actionData && "errors" in actionData) {
    errors = actionData.errors;
  }
  return (
    <div className="main-page">
      <Form
        className="form-basic"
        action="/transaction/add?type=Pengeluaran"
        method="post"
      >
        <input type="hidden" name="type-data" value={"Pengeluaran"} />
        <div className="form-date">
          <label htmlFor="transaction-date">Tanggal Transaksi</label>
          <input type="date" name="transaction-date" id="transaction-date" />
        </div>
        <em style={{ color: "red" }}>{errors?.date ? errors.date : null}</em>
        <div className="form-text">
          <label htmlFor="transaction-total">Nominal</label>
          <input
            type="number"
            value={nominal}
            onChange={(e) => {
              setNominal(e.target.value);
            }}
            name="transaction-total"
            id="transaction-total"
          />
          <p>
            <strong>Jumlah dalam Rupiah : </strong>
            {currencyFormat.format(Number(nominal))}
          </p>
          <em style={{ color: "red" }}>
            {errors?.total ? errors.total : null}
          </em>
        </div>
        <div className="form-text">
          <label htmlFor="transaction-category">Kategori Pengeluaran</label>
          <input
            type="text"
            name="transaction-category"
            id="transaction-category"
          />
        </div>
        <em style={{ color: "red" }}>
          {errors?.category ? errors?.category : null}
        </em>
        <div className="form-text">
          <label htmlFor="transaction-assets">Aset</label>
          <input
            type="text"
            name="transaction-assets"
            id="transaction-assets"
          />
        </div>
        <em style={{ color: "red" }}>{errors?.asset ? errors?.asset : null}</em>
        <div className="form-text">
          <label htmlFor="transaction-note">Catatan</label>
          <input type="text" name="transaction-note" id="transaction-note" />
        </div>
        <em style={{ color: "red" }}>{errors?.note ? errors?.note : null}</em>
        <div>
          <button className="form-submit">Tambah Pengeluaran</button>
        </div>
      </Form>
    </div>
  );
}
