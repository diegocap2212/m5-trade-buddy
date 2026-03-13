import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOperations, getUniqueAssets, type Operation } from '@/lib/operations-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, TrendingUp, TrendingDown, BarChart3, Trophy, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Report = () => {
  const allOps = useMemo(() => getOperations(), []);
  const assets = useMemo(() => getUniqueAssets(allOps), [allOps]);
  const [filterAsset, setFilterAsset] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(0);
  const perPage = 50;

  const ops = useMemo(() => {
    let filtered = allOps;
    if (filterAsset !== 'all') filtered = filtered.filter(o => o.asset === filterAsset);
    if (filterType !== 'all') filtered = filtered.filter(o => o.type === filterType);
    return filtered;
  }, [allOps, filterAsset, filterType]);

  const stats = useMemo(() => {
    const wins = ops.filter(o => o.status === 'WIN');
    const losses = ops.filter(o => o.status === 'LOSS');
    const totalResult = ops.reduce((s, o) => s + o.result, 0);
    const totalEntry = ops.reduce((s, o) => s + o.entry, 0);
    const biggestWin = wins.length > 0 ? Math.max(...wins.map(o => o.result)) : 0;
    const biggestLoss = losses.length > 0 ? Math.min(...losses.map(o => o.result)) : 0;
    return {
      total: ops.length,
      wins: wins.length,
      losses: losses.length,
      zeros: ops.filter(o => o.status === 'ZERO').length,
      winRate: ops.length > 0 ? (wins.length / ops.length * 100) : 0,
      totalResult,
      totalEntry,
      biggestWin,
      biggestLoss,
    };
  }, [ops]);

  // Asset stats
  const assetStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; total: number; result: number }>();
    for (const o of allOps) {
      const s = map.get(o.asset) || { wins: 0, losses: 0, total: 0, result: 0 };
      s.total++;
      s.result += o.result;
      if (o.status === 'WIN') s.wins++;
      if (o.status === 'LOSS') s.losses++;
      map.set(o.asset, s);
    }
    return [...map.entries()]
      .map(([asset, s]) => ({ asset, ...s, winRate: s.total > 0 ? (s.wins / s.total * 100) : 0 }))
      .sort((a, b) => b.result - a.result);
  }, [allOps]);

  // Hour stats
  const hourStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; total: number; result: number }>();
    for (const o of allOps) {
      const h = o.hour.replace('h', '').trim();
      if (!h || h === '-') continue;
      const key = `${h}h`;
      const s = map.get(key) || { wins: 0, losses: 0, total: 0, result: 0 };
      s.total++;
      s.result += o.result;
      if (o.status === 'WIN') s.wins++;
      if (o.status === 'LOSS') s.losses++;
      map.set(key, s);
    }
    return [...map.entries()]
      .map(([hour, s]) => ({ hour, ...s, winRate: s.total > 0 ? (s.wins / s.total * 100) : 0 }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [allOps]);

  // Equity curve
  const equityCurve = useMemo(() => {
    let balance = 0;
    return allOps.map((o, i) => {
      balance += o.result;
      return { index: i + 1, balance, date: o.date };
    });
  }, [allOps]);

  const paginatedOps = ops.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(ops.length / perPage);

  const exportCSV = () => {
    const header = 'Data,Horário,Ativo,Tipo,Entrada,Saída,Resultado,Status\n';
    const rows = ops.map(o =>
      `${o.date},${o.hour},${o.asset},${o.type},${o.entry.toFixed(2)},${o.exit.toFixed(2)},${o.result.toFixed(2)},${o.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_operacoes.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between bg-card/80 backdrop-blur-sm border border-border rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-mono text-sm font-bold text-foreground tracking-wider">RELATÓRIO DE OPERAÇÕES</h1>
              <span className="font-mono text-[10px] text-muted-foreground">04/02 – 13/03/2026</span>
            </div>
          </div>
          <Button onClick={exportCSV} size="sm" className="gap-2">
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase">Total Ops</span>
              </div>
              <p className="font-mono text-xl font-bold text-foreground">{stats.total}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{stats.wins}W / {stats.losses}L / {stats.zeros}Z</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase">Win Rate</span>
              </div>
              <p className={`font-mono text-xl font-bold ${stats.winRate >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                {stats.winRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase">Lucro Líquido</span>
              </div>
              <p className={`font-mono text-xl font-bold ${stats.totalResult >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatBRL(stats.totalResult)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase">Maior Gain</span>
              </div>
              <p className="font-mono text-lg font-bold text-emerald-500">{formatBRL(stats.biggestWin)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase">Maior Loss</span>
              </div>
              <p className="font-mono text-lg font-bold text-red-500">{formatBRL(stats.biggestLoss)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="operations" className="space-y-3">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="operations" className="font-mono text-xs">Operações</TabsTrigger>
            <TabsTrigger value="assets" className="font-mono text-xs">Por Ativo</TabsTrigger>
            <TabsTrigger value="hours" className="font-mono text-xs">Por Horário</TabsTrigger>
            <TabsTrigger value="equity" className="font-mono text-xs">Equity Curve</TabsTrigger>
          </TabsList>

          {/* Operations Table */}
          <TabsContent value="operations">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Select value={filterAsset} onValueChange={v => { setFilterAsset(v); setPage(0); }}>
                    <SelectTrigger className="w-40 h-8 font-mono text-xs">
                      <SelectValue placeholder="Ativo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Ativos</SelectItem>
                      {assets.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(0); }}>
                    <SelectTrigger className="w-32 h-8 font-mono text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Compra">Compra</SelectItem>
                      <SelectItem value="Venda">Venda</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="font-mono text-[10px] text-muted-foreground ml-auto">{ops.length} operações</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-[10px]">Data</TableHead>
                        <TableHead className="font-mono text-[10px]">Hora</TableHead>
                        <TableHead className="font-mono text-[10px]">Ativo</TableHead>
                        <TableHead className="font-mono text-[10px]">Tipo</TableHead>
                        <TableHead className="font-mono text-[10px] text-right">Entrada</TableHead>
                        <TableHead className="font-mono text-[10px] text-right">Saída</TableHead>
                        <TableHead className="font-mono text-[10px] text-right">Resultado</TableHead>
                        <TableHead className="font-mono text-[10px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOps.map((o, i) => (
                        <TableRow key={`${page}-${i}`} className="font-mono text-xs">
                          <TableCell className="py-1.5">{o.date}</TableCell>
                          <TableCell className="py-1.5">{o.hour}</TableCell>
                          <TableCell className="py-1.5">{o.asset}</TableCell>
                          <TableCell className="py-1.5">
                            <span className={o.type === 'Compra' ? 'text-emerald-500' : 'text-red-400'}>{o.type}</span>
                          </TableCell>
                          <TableCell className="py-1.5 text-right">{formatBRL(o.entry)}</TableCell>
                          <TableCell className="py-1.5 text-right">{formatBRL(o.exit)}</TableCell>
                          <TableCell className={`py-1.5 text-right font-bold ${o.result > 0 ? 'text-emerald-500' : o.result < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {formatBRL(o.result)}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              o.status === 'WIN' ? 'bg-emerald-500/20 text-emerald-500' :
                              o.status === 'LOSS' ? 'bg-red-500/20 text-red-500' :
                              'bg-muted text-muted-foreground'
                            }`}>{o.status}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-3 border-t border-border">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                    <span className="font-mono text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Asset Analysis */}
          <TabsContent value="assets">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-xs">Ranking por Lucro</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-mono text-[10px]">#</TableHead>
                          <TableHead className="font-mono text-[10px]">Ativo</TableHead>
                          <TableHead className="font-mono text-[10px] text-right">Ops</TableHead>
                          <TableHead className="font-mono text-[10px] text-right">Win Rate</TableHead>
                          <TableHead className="font-mono text-[10px] text-right">Lucro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assetStats.map((a, i) => (
                          <TableRow key={a.asset} className="font-mono text-xs">
                            <TableCell className="py-1.5">{i + 1}</TableCell>
                            <TableCell className="py-1.5 font-bold">{a.asset}</TableCell>
                            <TableCell className="py-1.5 text-right">{a.total}</TableCell>
                            <TableCell className={`py-1.5 text-right ${a.winRate >= 50 ? 'text-emerald-500' : 'text-red-400'}`}>{a.winRate.toFixed(1)}%</TableCell>
                            <TableCell className={`py-1.5 text-right font-bold ${a.result >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatBRL(a.result)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-xs">Lucro por Ativo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={assetStats} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <YAxis type="category" dataKey="asset" tick={{ fontSize: 10, fontFamily: 'monospace' }} width={55} />
                      <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                      <Bar dataKey="result" radius={[0, 4, 4, 0]}>
                        {assetStats.map((a, i) => (
                          <Cell key={i} fill={a.result >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hour Analysis */}
          <TabsContent value="hours">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-xs">Performance por Horário</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-mono text-[10px]">Horário</TableHead>
                          <TableHead className="font-mono text-[10px] text-right">Ops</TableHead>
                          <TableHead className="font-mono text-[10px] text-right">Win Rate</TableHead>
                          <TableHead className="font-mono text-[10px] text-right">Lucro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hourStats.map(h => (
                          <TableRow key={h.hour} className="font-mono text-xs">
                            <TableCell className="py-1.5 font-bold">{h.hour}</TableCell>
                            <TableCell className="py-1.5 text-right">{h.total}</TableCell>
                            <TableCell className={`py-1.5 text-right ${h.winRate >= 50 ? 'text-emerald-500' : 'text-red-400'}`}>{h.winRate.toFixed(1)}%</TableCell>
                            <TableCell className={`py-1.5 text-right font-bold ${h.result >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatBRL(h.result)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-xs">Lucro por Horário</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={hourStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                      <Bar dataKey="result" radius={[4, 4, 0, 0]}>
                        {hourStats.map((h, i) => (
                          <Cell key={i} fill={h.result >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Equity Curve */}
          <TabsContent value="equity">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-xs">Evolução do Saldo Acumulado</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={450}>
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="index" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Tooltip
                      formatter={(v: number) => formatBRL(v)}
                      labelFormatter={(l) => `Op #${l}`}
                      contentStyle={{ fontSize: 11, fontFamily: 'monospace' }}
                    />
                    <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center font-mono text-[10px] text-muted-foreground/50 py-1">
          Relatório gerado a partir de dados manuais • {allOps.length} operações processadas
        </p>
      </div>
    </div>
  );
};

export default Report;
