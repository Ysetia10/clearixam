import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

export const KPICardSkeleton = () => (
  <Card sx={{ p: 2 }}>
    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Skeleton variant="circular" width={18} height={18} sx={{ mr: 0.5 }} />
        <Skeleton variant="text" width={100} height={16} />
      </Box>
      <Skeleton variant="text" width={80} height={40} />
    </CardContent>
  </Card>
);

export const ChartSkeleton = () => (
  <Card sx={{ p: 2 }}>
    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
      <Skeleton variant="text" width={150} height={20} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 1 }} />
    </CardContent>
  </Card>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <Card sx={{ p: 2 }}>
    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
      <Skeleton variant="text" width={120} height={20} sx={{ mb: 2 }} />
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', gap: 2, mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="text" width={80} height={16} />
        </Box>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1, py: 0.5 }}>
            <Skeleton variant="text" width={80} height={16} />
            <Skeleton variant="text" width={80} height={16} />
            <Skeleton variant="text" width={80} height={16} />
            <Skeleton variant="text" width={60} height={24} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rectangular" width={80} height={28} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

export const SubjectCardSkeleton = () => (
  <Card sx={{ p: 2 }}>
    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="circular" width={32} height={32} />
      </Box>
      <Grid container spacing={1.5}>
        <Grid item xs={4}>
          <Skeleton variant="text" width={60} height={14} />
          <Skeleton variant="text" width={50} height={24} />
        </Grid>
        <Grid item xs={4}>
          <Skeleton variant="text" width={70} height={14} />
          <Skeleton variant="text" width={50} height={24} />
        </Grid>
        <Grid item xs={4}>
          <Skeleton variant="text" width={80} height={14} />
          <Skeleton variant="text" width={50} height={24} />
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

export const DashboardSkeleton = () => (
  <Box>
    <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
    
    {/* KPI Cards */}
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <KPICardSkeleton />
        </Grid>
      ))}
    </Grid>

    {/* Secondary Metrics */}
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} sm={6} md={3}>
        <KPICardSkeleton />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <KPICardSkeleton />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <KPICardSkeleton />
      </Grid>
    </Grid>

    {/* Chart and Weak Subjects */}
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} md={8}>
        <ChartSkeleton />
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ p: 2 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" width={100} height={24} sx={{ borderRadius: 3 }} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    {/* Mock History Table */}
    <TableSkeleton rows={5} />
  </Box>
);
