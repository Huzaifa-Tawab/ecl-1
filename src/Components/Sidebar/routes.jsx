import { BiCalculator, BiLogOut} from "react-icons/bi";
import { CiCalculator1 } from "react-icons/ci";

export const routes = [
   {
    path: "/eclcalculator",
    name: "Agging Data",
    icon: <BiCalculator />,
  },
  {
    path: "/macroeconomics",
    name: "Macro Economics",
    icon: <CiCalculator1 />,
  },
  {
    path: "/",
    name: "Log Out",
    icon: <BiLogOut />,
  },
];
