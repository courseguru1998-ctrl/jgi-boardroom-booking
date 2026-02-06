import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Users,
  Shield,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  UserCog,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/Modal';
import { Label } from '@/components/common/Label';
import { adminApi } from '@/services/admin';
import { toast } from '@/hooks/useToast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { cn } from '@/utils/cn';

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['ADMIN', 'USER']),
  department: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () =>
      adminApi.getUsers({
        search: search || undefined,
        limit: 50,
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'USER' },
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'User created successfully', variant: 'success' });
      setIsCreateModalOpen(false);
      reset();
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast({
        title: 'Failed to create user',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: adminApi.deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'User deactivated', variant: 'success' });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'ADMIN' | 'USER' }) =>
      adminApi.updateUser(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'User role updated', variant: 'success' });
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createMutation.mutate(data);
  };

  // Stats
  const totalUsers = data?.data?.length || 0;
  const activeUsers = data?.data?.filter((u) => u.isActive).length || 0;
  const adminUsers = data?.data?.filter((u) => u.role === 'ADMIN').length || 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600">
              <Users className="h-6 w-6 text-white" />
            </div>
            User Management
          </h1>
          <p className="text-foreground-secondary mt-1 ml-14">
            {totalUsers} users • {activeUsers} active • {adminUsers} admins
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Total Users</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalUsers}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-100">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Active</p>
                <p className="text-2xl font-bold text-foreground mt-1">{activeUsers}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Admins</p>
                <p className="text-2xl font-bold text-foreground mt-1">{adminUsers}</p>
              </div>
              <div className="p-3 rounded-xl bg-jgi-gold/10">
                <Shield className="h-6 w-6 text-jgi-gold" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-12 h-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="text-foreground-muted mt-4">Loading users...</p>
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                <Users className="h-8 w-8 text-foreground-muted" />
              </div>
              <h3 className="font-semibold text-foreground">No users found</h3>
              <p className="text-foreground-muted mt-1">
                {search ? 'Try a different search term' : 'Add your first user to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">User</th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Role</th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Department</th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Bookings</th>
                    <th className="text-right py-4 px-4 font-semibold text-foreground-muted text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((user) => {
                    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-sm font-semibold">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-foreground-muted flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              updateRoleMutation.mutate({
                                id: user.id,
                                role: e.target.value as 'ADMIN' | 'USER',
                              })
                            }
                            className={cn(
                              'rounded-lg border-2 px-3 py-1.5 text-sm font-medium bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                              user.role === 'ADMIN'
                                ? 'border-jgi-gold/50 text-jgi-gold'
                                : 'border-input text-foreground-secondary'
                            )}
                          >
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-foreground-secondary">
                            <Building2 className="h-4 w-4" />
                            {user.department || '-'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                              user.isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            )}
                          >
                            {user.isActive ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            {user._count.bookings}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {user.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateMutation.mutate(user.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              Deactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserCog className="h-5 w-5 text-primary" />
              </div>
              Create New User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  error={errors.firstName?.message}
                  {...register('firstName')}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  error={errors.lastName?.message}
                  {...register('lastName')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('role')}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input {...register('department')} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
