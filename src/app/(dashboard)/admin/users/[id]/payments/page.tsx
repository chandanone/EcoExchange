import { auth } from '@/lib/auth';
import { getUserPaymentHistory } from '@/actions/admin-actions';
import { prisma } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function AdminUserPaymentsPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') return null;

    const [user, transactionsResult] = await Promise.all([
        prisma.user.findUnique({
            where: { id: params.id },
            select: { name: true, email: true, subscriptionTier: true, credits: true, subscriptionEndsAt: true },
        }),
        getUserPaymentHistory(params.id),
    ]);

    if (!user || !transactionsResult.success) {
        return (
            <div className="p-8 text-center text-red-600">
                User not found or error loading payments
            </div>
        );
    }

    const transactions = transactionsResult.data || [];
    const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
    const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Payment History</h1>
                    <p className="mt-2 text-gray-600">
                        For: <span className="font-semibold">{user.name}</span> ({user.email})
                    </p>
                </div>
                <Link href="/admin/users">
                    <Button variant="outline">Back to Users</Button>
                </Link>
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Current Tier</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.subscriptionTier}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Current Credits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.credits}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Plan Valid Until</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {user.subscriptionEndsAt
                                ? dateFormatter.format(new Date(user.subscriptionEndsAt))
                                : 'N/A (FREE)'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            No transactions recorded for this user.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b">
                                        <th className="pb-4 pt-0 font-semibold text-gray-900">Date</th>
                                        <th className="pb-4 pt-0 font-semibold text-gray-900">Transaction ID</th>
                                        <th className="pb-4 pt-0 font-semibold text-gray-900">Type</th>
                                        <th className="pb-4 pt-0 font-semibold text-gray-900">Validity</th>
                                        <th className="pb-4 pt-0 text-right font-semibold text-gray-900">Credits</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50/50">
                                            <td className="py-4 text-sm text-gray-600">
                                                {dateFormatter.format(new Date(tx.createdAt))}
                                                <div className="text-xs text-gray-400">
                                                    {timeFormatter.format(new Date(tx.createdAt))}
                                                </div>
                                            </td>
                                            <td className="py-4 text-xs font-mono text-gray-500">
                                                {tx.stripePaymentIntentId || (tx.id.substring(0, 10) + '...')}
                                            </td>
                                            <td className="py-4">
                                                <Badge variant={
                                                    tx.type === 'SUBSCRIPTION' || tx.type === 'TOP_UP' ? 'secondary' : 'outline'
                                                }>
                                                    {tx.type}
                                                </Badge>
                                            </td>
                                            <td className="py-4 text-sm text-gray-600">
                                                {tx.validityStart && tx.validityEnd ? (
                                                    <div className="flex flex-col">
                                                        <span>{dateFormatter.format(new Date(tx.validityStart))}</span>
                                                        <span className="text-xs text-gray-400">to {dateFormatter.format(new Date(tx.validityEnd))}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
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
