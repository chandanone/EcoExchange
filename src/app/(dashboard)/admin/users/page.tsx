import { auth } from '@/lib/auth';
import { getUsers } from '@/actions/admin-actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function AdminUsersPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') return null;

    const result = await getUsers();
    if (!result.success || !result.data) return <div>Error loading users</div>;

    const users = result.data;
    const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">User Management</h1>
                <p className="mt-2 text-gray-600">Overview of all registered users</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User List ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="pb-4 pt-0 font-semibold">User</th>
                                    <th className="pb-4 pt-0 font-semibold">Role</th>
                                    <th className="pb-4 pt-0 font-semibold">Plan</th>
                                    <th className="pb-4 pt-0 font-semibold">Credits</th>
                                    <th className="pb-4 pt-0 font-semibold">Joined</th>
                                    <th className="pb-4 pt-0 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.map((user) => (
                                    <tr key={user.id} className="group hover:bg-gray-50/50">
                                        <td className="py-4">
                                            <div className="font-medium text-gray-900">{user.name || 'No Name'}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="py-4">
                                            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="py-4">
                                            <Badge variant={user.subscriptionTier === 'FREE' ? 'outline' : 'default'} className={user.subscriptionTier !== 'FREE' ? 'bg-indigo-100 text-indigo-700' : ''}>
                                                {user.subscriptionTier}
                                            </Badge>
                                        </td>
                                        <td className="py-4 font-medium">{user.credits}</td>
                                        <td className="py-4 text-sm text-gray-600">
                                            {dateFormatter.format(new Date(user.createdAt))}
                                        </td>
                                        <td className="py-4 text-right">
                                            <Link href={`/admin/users/${user.id}/payments`}>
                                                <Button variant="outline" size="sm">
                                                    View Payments
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
