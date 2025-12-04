import React from 'react';
import TransactionTable from '../components/history/TransactionTable';
import { salesHistory } from '../data/mockData';

const History = () => {
    return (
        <div>
            <TransactionTable transactions={salesHistory} />
        </div>
    );
};

export default History;
