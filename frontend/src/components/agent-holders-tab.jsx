import { Copy } from "lucide-react";
import { ellipsizeAddress, writeToClipboard } from "@/lib/utils";

const AgentHoldersTab = ({ holders }) => {
  return (
    <div>
      <p className="mt-3 ml-2 font-semibold">Top Token Holders</p>
      <div className="mt-3 px-3 py-2 bg-primary-foreground border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="[&>th]:font-semibold border-b">
              <th scope="col">#</th>
              <th scope="col">Holder</th>
              <th scope="col">%</th>
            </tr>
          </thead>
          <tbody className="font-mono [&>tr:not(:last-child)]:border-b">
            {holders.map((holder, idx) => (
              <tr key={idx} className="[&>th,td]:py-0.5">
                <th scope="row" className="font-semibold">
                  {idx + 1}
                </th>
                <td className="flex justify-center items-center gap-2">
                  <span className="text-accent">
                    {ellipsizeAddress(holder.address)}
                  </span>
                  <button
                    className="cursor-pointer"
                    onClick={() => writeToClipboard(holder.address)}
                  >
                    <Copy className="size-4" />
                  </button>
                </td>
                <td className="text-center">{holder.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentHoldersTab; 