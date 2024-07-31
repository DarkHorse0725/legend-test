import { useWeb3Modal, useWeb3ModalAccount } from "@web3modal/ethers5/react";
import { FC } from "react";
import truncateEthAddress from "truncate-eth-address";


interface Props { }
const Header: FC<Props> = () => {
  const { open } = useWeb3Modal();
  const { address } = useWeb3ModalAccount();
  return (
    <div className="h-[80px] w-full flex justify-end bg-blue-400 items-center lg:px-[30px]">
      {
        !!address ? (
          <div
            className="bg-blue-700 p-4 rounded-xl text-white font-bold"
          >{truncateEthAddress(address)}</div>
        ) : (
          <button
            onClick={() => open()}
            className="bg-blue-700 p-4 rounded-xl text-white font-bold"
          >
            Connect Wallet
          </button>
        )
      }
    </div>
  );
}

export default Header;