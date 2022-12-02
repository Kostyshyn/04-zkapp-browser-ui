import '../styles/globals.css'
import { useEffect, useState } from 'react';
import './reactCOIServiceWorker';
import ZkappWorkerClient from './zkappWorkerClient';
import {
  PublicKey,
  PrivateKey,
  Field,
} from 'snarkyjs'

export interface InitialState {
  zkappWorkerClient: null | ZkappWorkerClient;
  hasWallet: null | boolean;
  hasBeenSetup: boolean;
  accountExists: boolean;
  currentNum: null | Field;
  publicKey: null | PublicKey;
  zkappPublicKey: null | PublicKey;
  creatingTransaction: boolean;
}

let transactionFee = 0.1;
export default function App() {
  let [state, setState] = useState<InitialState>({
    zkappWorkerClient: null,
    hasWallet: null,
    hasBeenSetup: false,
    accountExists: false,
    currentNum: null,
    publicKey: null,
    zkappPublicKey: null,
    creatingTransaction: false
  });


  // -------------------------------------------------------
  // Do Setup
  useEffect(() => {
    (async () => {
      if (!state.hasBeenSetup) {
        const zkappWorkerClient = new ZkappWorkerClient();
        console.log('Loading SnarkyJS...');
        await zkappWorkerClient.loadSnarkyJS();
        console.log('done');

        await zkappWorkerClient.setActiveInstanceToBerkeley();
        const mina = (window as any).mina;
        if (mina == null) {
          setState({ ...state, hasWallet: false });
          return;
        }
        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);
        console.log('using key', publicKey.toBase58());
        console.log('checking if account exists...');
        const res = await zkappWorkerClient.fetchAccount({ publicKey: publicKey! });

        const accountExists = res.error == null;
        await zkappWorkerClient.loadContract();
        console.log('compiling zkApp');
        await zkappWorkerClient.compileContract();
        console.log('zkApp compiled');
        const zkappPublicKey = PublicKey.fromBase58('B62qrBBEARoG78KLD1bmYZeEirUfpNXoMPYQboTwqmGLtfqAGLXdWpU');
        await zkappWorkerClient.initZkappInstance(zkappPublicKey);
        console.log('getting zkApp state...');
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey })
        const currentNum = await zkappWorkerClient.getNum();

        console.log('current state:', currentNum.toString());
        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          currentNum
        });
      }
    })();
  }, []);
  // -------------------------------------------------------

  // Wait for account to exist, if it didn't
  useEffect(() => {
    (async () => {
      if (state.hasBeenSetup && !state.accountExists) {
        for (; ;) {
          console.log('checking if account exists...');
          const res = await state.zkappWorkerClient!.fetchAccount({ publicKey: state.publicKey! })
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [state.hasBeenSetup]);
  // -------------------------------------------------------


  return <div>Test</div>
}
