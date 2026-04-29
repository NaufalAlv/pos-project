'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, User, Phone, Star, Wrench, Droplet, Gift, Calendar, Activity } from 'lucide-react';
import api from '@/utils/api';
import MaskedField from '@/components/ui/MaskedField';

interface TimelineEvent {
  id: string;
  event_type: 'SERVICE' | 'FUEL_PURCHASE' | 'LOYALTY_EARNED' | 'LOYALTY_REDEEMED';
  timestamp: string;
  amount_idr?: number;
  points_delta?: number;
  description: string;
  source: 'POS' | 'PUMP_GATEWAY' | 'MANUAL';
}

interface CRMProfileData {
  customer: {
    global_uid: string;
    name: string;
    phone: string | null;
    plate_number: string | null;
    metadata: Record<string, any>;
    loyalty_points: number;
    created_at: string;
  };
  timeline: TimelineEvent[];
  summary: {
    total_spent_idr: number;
    total_visits: number;
    last_visit: string;
  };
}

const eventConfig = {
  SERVICE: { icon: <Wrench size={16} />, color: 'bg-blue-500', label: 'Workshop Service' },
  FUEL_PURCHASE: { icon: <Droplet size={16} />, color: 'bg-emerald-500', label: 'Fuel Purchase' },
  LOYALTY_EARNED: { icon: <Star size={16} />, color: 'bg-yellow-500', label: 'Points Earned' },
  LOYALTY_REDEEMED: { icon: <Gift size={16} />, color: 'bg-purple-500', label: 'Points Redeemed' },
};

export default function CRMProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<CRMProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | TimelineEvent['event_type']>('ALL');

  useEffect(() => {
    fetchProfile();
    const interval = setInterval(fetchProfile, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/customers/${id}/profile`);
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch CRM profile', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!data) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-500">Customer not found</h2>
            <Button onClick={() => router.push('/customers')} className="mt-4">Back to Customers</Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const filteredEvents = data.timeline.filter(e => filter === 'ALL' || e.event_type === filter);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => router.push('/customers')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
              <ArrowLeft size={20} className="text-slate-500" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-neutral uppercase tracking-tight flex items-center gap-3">
                360° CUSTOMER PROFILE
              </h1>
              <p className="text-slate-400 font-bold text-sm mt-1">Global Identity: <span className="font-mono text-xs">{data.customer.global_uid}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Left Column: Identity & Loyalty */}
            <div className="md:col-span-4 space-y-6">
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={16} /> Identity Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                    <p className="text-xl font-black text-neutral uppercase">{data.customer.name}</p>
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Phone size={12} /> Registered Phone
                    </p>
                    <MaskedField
                      fieldName="phone"
                      maskedValue="***-****-****"
                      customerUid={data.customer.global_uid}
                    />
                  </div>

                  {data.customer.metadata?.tax_id_encrypted && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        Tax ID (NPWP)
                      </p>
                      <MaskedField
                        fieldName="tax_id"
                        maskedValue="**-***-***-*-***-***"
                        customerUid={data.customer.global_uid}
                      />
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vehicle Plate</p>
                    <p className="font-bold text-neutral">{data.customer.plate_number || 'N/A'}</p>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Member Since</p>
                    <p className="font-bold text-neutral">{new Date(data.customer.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-linear-to-br from-primary to-blue-600 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
                <CardContent className="p-6">
                  <p className="text-[10px] font-black opacity-80 uppercase tracking-widest flex items-center gap-1">
                    <Star size={12} className="fill-current" /> Loyalty Status
                  </p>
                  <p className="text-4xl font-black mt-2">{data.customer.loyalty_points.toLocaleString('id-ID')}</p>
                  <p className="text-xs font-bold opacity-80 mt-1 uppercase">Available Points</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lifetime Value</p>
                  <p className="text-2xl font-black text-emerald-500 tracking-tight">Rp {data.summary.total_spent_idr.toLocaleString('id-ID')}</p>
                  <div className="flex gap-4 mt-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Visits</p>
                      <p className="font-black text-neutral">{data.summary.total_visits}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Last Visit</p>
                      <p className="font-black text-neutral">{data.summary.last_visit ? new Date(data.summary.last_visit).toLocaleDateString('id-ID') : '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Timeline */}
            <div className="md:col-span-8">
              <Card className="border-border/50 h-full">
                <CardHeader className="border-b border-border/50 bg-slate-50/50 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <CardTitle className="text-sm font-black text-neutral uppercase tracking-widest flex items-center gap-2">
                      <Activity size={16} className="text-primary" /> Activity Timeline
                    </CardTitle>
                    <div className="flex gap-2">
                      {['ALL', 'SERVICE', 'FUEL_PURCHASE', 'LOYALTY_EARNED'].map(type => (
                        <button
                          key={type}
                          onClick={() => setFilter(type as any)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === type ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {type === 'ALL' ? 'All Activity' : eventConfig[type as keyof typeof eventConfig]?.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto p-6 space-y-6">
                    {filteredEvents.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                        <Activity size={48} className="mx-auto mb-3" />
                        <p className="font-bold">No activity found</p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                        {filteredEvents.map((event) => (
                          <div key={event.id} className="relative pl-6 group">
                            <div className={`absolute -left-[11px] top-0.5 h-5 w-5 rounded-full border-4 border-white ${eventConfig[event.event_type].color} flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-125`}>
                            </div>
                            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-neutral uppercase text-sm">{event.description}</span>
                                  <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                    {event.source}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                  <Calendar size={12} />
                                  {new Date(event.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex gap-4">
                                {event.amount_idr !== undefined && event.amount_idr > 0 && (
                                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</p>
                                    <p className="font-black text-neutral text-sm">Rp {event.amount_idr.toLocaleString('id-ID')}</p>
                                  </div>
                                )}
                                {event.points_delta !== undefined && event.points_delta > 0 && (
                                  <div className="bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100 text-yellow-700">
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Points</p>
                                    <p className="font-black text-sm flex items-center gap-1">
                                      +{event.points_delta} <Star size={12} className="fill-current" />
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
