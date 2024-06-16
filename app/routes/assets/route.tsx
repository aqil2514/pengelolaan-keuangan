import { LoaderFunctionArgs, MetaFunction, json } from "@remix-run/node";
import { useLoaderData, useNavigation } from "@remix-run/react";
import axios from "axios";
import { endpoint } from "lib/server";
import { AssetsData } from "~/@types/assets";
import { authenticator } from "~/service/auth.server";
import { ClientOnly } from "remix-utils/client-only";
import MainPage from "./main";
import { createContext, useContext } from "react";
import Loading from "components/Loading/Loading";
import { TransactionType } from "../transaction/route";
import { getUser } from "utils/account";

export const meta: MetaFunction = () => [
  {
    title: "Asset | Moneyku",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const user = await getUser(request);

  if(!user) throw new Error("Data user tidak ditemukan")

  const res = await axios.get(`${endpoint}/assets/getAssets`, {
    params: {
      uid: user.uid as string,
    },
  });

  const assetData: AssetsData[] = res.data.assetData;
  const transactionData: TransactionType[] = res.data.transactionData;

  return json({ assetData, transactionData });
}

interface AssetContextType {
  assetData: AssetsData[];
  transactionData: TransactionType[];
}

const AssetContext = createContext<AssetContextType>({} as AssetContextType);

export default function Assets() {
  const { assetData, transactionData } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isPending = navigation.state === "loading";
  return (
    <ClientOnly>
      {() => (
        <AssetContext.Provider value={{ assetData, transactionData }}>
          {isPending && <Loading />}
          <MainPage />
        </AssetContext.Provider>
      )}
    </ClientOnly>
  );
}

export function useAssetContext() {
  return useContext(AssetContext);
}
