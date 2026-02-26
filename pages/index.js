import Head from 'next/head';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('../components/Dashboard'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Brainrot Automation Dashboard</title>
        <meta name="description" content="Automated YouTube brainrot content generator" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>🧠</text></svg>" />
      </Head>
      <Dashboard />
    </>
  );
}
