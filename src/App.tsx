import { createWeb3Modal, defaultConfig, useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers5/react'
import Header from './components/Header';
import truncateEthAddress from 'truncate-eth-address';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { tokenList } from './constants/tokens';
import { BigNumber, Contract, ethers } from 'ethers';
import { contracts, rpcUrl } from './constants/networks';
import ROUTER from './contracts/UniswapV2Router02.sol/UniswapV2Router02.json';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import ERC20 from './contracts/mock/ERC20.sol/ERC20.json';
import toast, { Toaster } from 'react-hot-toast';

const projectId = '588bcfc95384e4bb82bd504c4becdf7e';

const testnet = {
  chainId: 11155111,
  name: 'Sepolia test network',
  currency: 'SepoliaETH',
  explorerUrl: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://sepolia.infura.io/v3/333dde50efb045c3b2c60a9203a37778'
}

const metadata = {
  name: 'My Website',
  description: 'My Website description',
  url: 'https://mywebsite.com', // origin must match your domain & subdomain
  icons: ['https://avatars.mywebsite.com/']
}

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  /*Required*/
  metadata,

  /*Optional*/
  enableEIP6963: true, // true by default
  enableInjected: true, // true by default
  enableCoinbase: true, // true by default
  // rpcUrl: '...', // used for the Coinbase SDK
  defaultChainId: 11155111 // used for the Coinbase SDK
})

createWeb3Modal({
  ethersConfig,
  chains: [testnet],
  projectId,
  enableAnalytics: true // Optional - defaults to your Cloud configuration
})

function App() {
  const [amountIn, setAmountIn] = useState('0');
  const [amountOut, setAmountOut] = useState('0');
  const [sourceToken, setSourceToken] = useState(tokenList[0].address)
  const [targetToken, setTargetToken] = useState(tokenList[1].address)
  const [loading, setLoading] = useState(false);
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider()

  const _renderLoading = () => {
    return (
      <svg
        className="animate-spin -ml-1 mr-3 h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    );
  };

  useEffect(() => {
    (async () => {
      if (Number(amountIn) > 0) {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const router = new Contract(contracts.router, ROUTER.abi, provider);
        const [amount0, amount1] = await router.getAmountsOut(parseUnits(amountIn, 18), [sourceToken, targetToken]);
        setAmountOut(formatUnits(amount1, 18));
      }
    })();
  }, [sourceToken, targetToken, amountIn]);

  const sourceTokenChangeHandler = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSourceToken(e.target.value)
    if (e.target.value === targetToken) {
      const target = tokenList.filter(token => token.address !== e.target.value)[0];
      setTargetToken(target.address);
    }
  }, [targetToken]);

  const targetTokenChangeHandler = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setTargetToken(e.target.value)
    if (e.target.value === sourceToken) {
      const target = tokenList.filter(token => token.address !== e.target.value)[0];
      setSourceToken(target.address);
    }
  }, [sourceToken]);

  const buyHandler = useCallback(async () => {
    try {
      if (!isConnected || !walletProvider) {
        toast.error('Wallet is not connected!');
        return;
      }
      setLoading(true);
      const ethersProvider = new ethers.providers.Web3Provider(walletProvider);
      const signer = ethersProvider.getSigner();
      const token = new Contract(sourceToken, ERC20.abi, signer);
      const allowance: BigNumber = await token.allowance(address, contracts.router);
      if (allowance < parseUnits(amountIn, 18)) {
        toast.success("approving")
        const approveTx = await token.approve(contracts.router, parseUnits(amountIn, 18));
        await approveTx.wait();
        toast.success("Approved successfully");
      }
      const router = new Contract(contracts.router, ROUTER.abi, signer);
      toast.success("Buying now");
      const now = Math.floor(Date.now() / 1000);
      const swapTxn = await router.swapExactTokensForTokens(
        parseUnits(amountIn, 18),
        0,
        [sourceToken, targetToken],
        address,
        now + 10
      );
      await swapTxn.wait();
      toast.success("Bought successfully")
      setLoading(false);
    } catch (e) {
      console.log(e)
      setLoading(false);
    }
  }, [amountIn, sourceToken, targetToken]);

  return (
    <div className='relative h-screen w-screen'>
      <div className='absolute p-4 border left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow rounded-xl'>
        <div className='w-full h-full flex flex-col gap-4'>
          <div className='flex justify-end'>
            {
              !!address ? (
                <div
                  className="bg-blue-700 px-4 py-2 rounded-xl text-white font-bold"
                >{truncateEthAddress(address)}</div>
              ) : (
                <button
                  onClick={() => open()}
                  className="bg-blue-700 px-4 py-2 rounded-xl text-white font-bold"
                >
                  Connect Wallet
                </button>
              )
            }
          </div>
          <div className='flex gap-2'>
            <div className='flex w-1/2'>
              <input
                value={amountIn}
                onChange={e => setAmountIn(e.target.value)}
                className='border-b border-l border-t flex-1 rounded-tl-md rounded-bl-md text-right px-2'
              />
              <select
                value={sourceToken}
                onChange={sourceTokenChangeHandler}
                className='border h-[40px] px-2 rounded-tr-md rounded-br-md'
              >
                {
                  tokenList.map((token, i) => (
                    <option key={i} value={token.address}>{token.name}</option>
                  ))
                }
              </select>
            </div>
            <div className='flex w-1/2'>
              <input
                value={amountOut}
                onChange={e => setAmountOut(e.target.value)}
                className='border-b border-l border-t flex-1 rounded-tl-md rounded-bl-md text-right px-2'
              />
              <select
                value={targetToken}
                onChange={targetTokenChangeHandler}
                className='border h-[40px] px-2 rounded-tr-md rounded-br-md'
              >
                {
                  tokenList.map((token, i) => (
                    <option key={i} value={token.address}>{token.name}</option>
                  ))
                }
              </select>
            </div>
          </div>
          <div>
            <button
              disabled={loading}
              onClick={buyHandler}
              className={`w-full h-[40px] flex justify-center items-center ${loading ? 'bg-amber-200' : 'bg-amber-400'} text-white rounded-xl font-bold`}
            >
              <div>
                {
                  loading && (<_renderLoading  />)
                }
              </div>
              Buy
            </button>
          </div>
        </div>
      </div>
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          success: {
            style: {
              background: 'green',
              color: 'white'
            },
          },
          error: {
            style: {
              background: 'red',
              color: 'white'
            },
          },
        }}
      />
    </div>
  );
}

export default App;
