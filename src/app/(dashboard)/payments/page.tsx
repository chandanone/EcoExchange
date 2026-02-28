import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { CreditCard } from 'lucide-react';

export default async function PaymentHistoryPage() {
    const session = await auth();
    if (!session?.user) return null;

    const [transactions, user] = await Promise.all([
        prisma.creditTransaction.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { subscriptionEndsAt: true, subscriptionTier: true }
        })
    ]);

    const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
    const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Transaction History</h1>
                    <p className="mt-2 text-gray-600">Track your payments and credit usage</p>
                </div>
                {user?.subscriptionTier !== 'FREE' && user?.subscriptionEndsAt && (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Plan Validity</p>
                            <p className="text-sm font-medium text-gray-900">
                                {user.subscriptionTier} ends on {dateFormatter.format(new Date(user.subscriptionEndsAt))}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            No transactions found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b">
                                        <th className="pb-4 pt-0 font-semibold">Date</th>
                                        <th className="pb-4 pt-0 font-semibold">Type</th>
                                        <th className="pb-4 pt-0 font-semibold">Description</th>
                                        <th className="pb-4 pt-0 font-semibold">Validity Period</th>
                                        <th className="pb-4 pt-0 text-right font-semibold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="group hover:bg-gray-50/50">
                                            <td className="py-4 text-sm text-gray-600">
                                                {dateFormatter.format(new Date(tx.createdAt))}
                                                <div className="text-xs text-gray-400">
                                                    {timeFormatter.format(new Date(tx.createdAt))}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <Badge variant={
                                                    tx.type === 'SUBSCRIPTION' || tx.type === 'TOP_UP' ? 'default' : 'secondary'
                                                }>
                                                    {tx.type.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="py-4 text-sm text-gray-700" title={tx.description || ''}>
                                                {tx.description || 'No description'}
                                            </td>
                                            <td className="py-4 text-sm text-gray-600">
                                                {tx.validityStart && tx.validityEnd ? (
                                                    <div className="flex flex-col">
                                                        <span>{dateFormatter.format(new Date(tx.validityStart))}</span>
                                                        <span className="text-xs text-gray-400">to {dateFormatter.format(new Date(tx.validityEnd))}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">None</span>
                                                )}
                                            </td>
                                            <td className="py-4 text-right font-medium">
                                                <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount} Credits
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
