import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Button,
  Typography,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  useMediaQuery,
  useTheme,
  Collapse,
  Chip,
  Grid,
  Menu,
  MenuItem,
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Fab,
  TextField,
  InputAdornment,
  LinearProgress,
} from "@mui/material";

import {
  MoreVert,
  Email,
  Edit,
  Delete,
  AttachFile,
  CheckCircle,
  Add as AddIcon,
  FilterList,
  Search,
  PersonAdd,
  Task,
  Description,
  Business,
  Work,
  ExpandMore
} from "@mui/icons-material";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const staticOnboardings = [
  {
    _id: "1",
    candidateName: "Marie Dubois",
    companyName: "TechNova",
    jobTitle: "Développeuse Web",
    status: "En cours",
    contractSigned: true,
    startDate: "2023-06-15",
    progress: 75,
    documents: [
      { name: "Contrat de travail", url: "/documents/contrat_marie.pdf", type: "contract" },
      { name: "Guide de l'entreprise", url: "/documents/guide_technova.pdf", type: "guide" },
    ],
    checklist: [
      { task: "Configurer l'email professionnel", completed: true, critical: true },
      { task: "Fournir les identifiants Slack", completed: true, critical: true },
      { task: "Organiser la réunion d'accueil", completed: false, critical: false },
      { task: "Transmettre le guide de l'entreprise", completed: true, critical: false },
    ],
  },
  {
    _id: "2",
    candidateName: "Jean Martin",
    companyName: "Innovatech",
    jobTitle: "Analyste Data",
    status: "En attente",
    contractSigned: false,
    startDate: "2023-07-01",
    progress: 30,
    documents: [{ name: "Contrat en attente", url: null, type: "contract" }],
    checklist: [
      { task: "Valider le contrat", completed: false, critical: true },
      { task: "Configurer l'accès aux outils", completed: false, critical: true },
    ],
  },
];

const Onboarding = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const [onboardings, setOnboardings] = useState(staticOnboardings);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOnboardingId, setSelectedOnboardingId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDelete = () => {
    setOnboardings((prev) => prev.filter((o) => o._id !== selectedOnboardingId));
    showSnackbar("Onboarding supprimé", "success");
    setDeleteDialogOpen(false);
  };

  const handleTaskToggle = (onboardingId, taskIndex) => {
    setOnboardings(prev =>
      prev.map(o => {
        if (o._id === onboardingId) {
          const newChecklist = o.checklist.map((t, idx) => 
            idx === taskIndex ? { ...t, completed: !t.completed } : t
          );
          const completedCount = newChecklist.filter(t => t.completed).length;
          const progress = Math.round((completedCount / newChecklist.length) * 100);
          return { ...o, checklist: newChecklist, progress };
        }
        return o;
      })
    );
    showSnackbar("Tâche mise à jour", "success");
  };

  const handleMenuOpen = (e, row) => {
    setAnchorEl(e.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleRowExpand = (rowId) => {
    setExpandedRow(prev => (prev === rowId ? null : rowId));
  };

  const filteredOnboardings = onboardings.filter(o => {
    const matchesStatus = statusFilter === "Tous" || o.status === statusFilter;
    const matchesSearch = o.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         o.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "En cours": return "primary";
      case "En attente": return "warning";
      case "Terminé": return "success";
      default: return "default";
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case "contract": return <Description color="primary" />;
      case "guide": return <Task color="secondary" />;
      default: return <AttachFile />;
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      
      <Container maxWidth="xl" sx={{ py: 4, mt: 10 }}>
        {/* Header avec recherche et actions */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h4" fontWeight={700} color="textPrimary">
                  Onboardings
                </Typography>
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Suivi des processus d'intégration
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
                  <TextField
                    size="small"
                    placeholder="Rechercher..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 200 }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => setFilterDrawerOpen(true)}
                  >
                    Filtres
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    component={Link}
                    to="/onboarding/new"
                    sx={{ ml: 'auto' }}
                  >
                    Nouveau
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Contenu principal */}
        {filteredOnboardings.length > 0 ? (
          <Paper sx={{ borderRadius: 3, boxShadow: 2, overflow: 'hidden' }}>
            <Box component="table" width="100%">
              <Box component="thead" sx={{ 
                backgroundColor: theme.palette.grey[100],
                borderBottom: `1px solid ${theme.palette.divider}`
              }}>
                <Box component="tr">
                  <Box component="th" sx={{ 
                    padding: '16px', 
                    textAlign: 'left',
                    color: theme.palette.text.primary,
                    fontWeight: 600
                  }}>Candidat</Box>
                  <Box component="th" sx={{ 
                    padding: '16px', 
                    textAlign: 'left',
                    color: theme.palette.text.primary,
                    fontWeight: 600
                  }}>Entreprise</Box>
                  <Box component="th" sx={{ 
                    padding: '16px', 
                    textAlign: 'left',
                    color: theme.palette.text.primary,
                    fontWeight: 600
                  }}>Poste</Box>
                  <Box component="th" sx={{ 
                    padding: '16px', 
                    textAlign: 'left',
                    color: theme.palette.text.primary,
                    fontWeight: 600
                  }}>Statut</Box>
                  <Box component="th" sx={{ 
                    padding: '16px', 
                    textAlign: 'left',
                    color: theme.palette.text.primary,
                    fontWeight: 600
                  }}>Progression</Box>
                  <Box component="th" sx={{ 
                    padding: '16px', 
                    textAlign: 'right',
                    color: theme.palette.text.primary,
                    fontWeight: 600
                  }}>Actions</Box>
                </Box>
              </Box>
              <Box component="tbody">
                {filteredOnboardings.map((row) => (
                  <React.Fragment key={row._id}>
                    <Box 
                      component="tr"
                      hover
                      sx={{ 
                        '&:hover': { backgroundColor: theme.palette.action.hover },
                        cursor: 'pointer'
                      }}
                      onClick={() => handleRowExpand(row._id)}
                    >
                      <Box component="td" sx={{ padding: '16px' }}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                            {row.candidateName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600}>{row.candidateName}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              Début: {row.startDate}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box component="td" sx={{ padding: '16px' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Business color="action" />
                          {row.companyName}
                        </Box>
                      </Box>
                      <Box component="td" sx={{ padding: '16px' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Work color="action" />
                          {row.jobTitle}
                        </Box>
                      </Box>
                      <Box component="td" sx={{ padding: '16px' }}>
                        <Chip
                          label={row.status}
                          color={getStatusColor(row.status)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Box component="td" sx={{ padding: '16px' }}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <LinearProgress
                            variant="determinate"
                            value={row.progress}
                            sx={{ height: 8, borderRadius: 4, flexGrow: 1 }}
                            color={row.progress > 75 ? 'success' : row.progress > 40 ? 'primary' : 'warning'}
                          />
                          <Typography variant="body2" color="textSecondary">
                            {row.progress}%
                          </Typography>
                        </Box>
                      </Box>
                      <Box component="td" sx={{ padding: '16px', textAlign: 'right' }}>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, row);
                          }}
                          size="small"
                          sx={{ color: theme.palette.text.secondary }}
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {/* Détails dépliables */}
                    <Box component="tr">
                      <Box 
                        component="td" 
                        colSpan={6} 
                        sx={{ 
                          padding: 0, 
                          border: 0,
                          backgroundColor: theme.palette.background.default
                        }}
                      >
                        <Collapse in={expandedRow === row._id} timeout="auto" unmountOnExit>
                          <Box p={3}>
                            <Grid container spacing={3}>
                              {/* Checklist */}
                              <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                  <CardHeader
                                    title="Checklist"
                                    avatar={<Task color="primary" />}
                                    subheader={`${row.checklist.filter(t => t.completed).length} sur ${row.checklist.length} tâches complétées`}
                                  />
                                  <CardContent>
                                    <List dense>
                                      {row.checklist.map((task, idx) => (
                                        <ListItem key={idx} disablePadding sx={{ mb: 1 }}>
                                          <Checkbox
                                            checked={task.completed}
                                            onChange={() => handleTaskToggle(row._id, idx)}
                                            size="small"
                                            color={task.critical ? 'error' : 'primary'}
                                          />
                                          <ListItemText
                                            primary={task.task}
                                            sx={{
                                              textDecoration: task.completed ? 'line-through' : 'none',
                                              color: task.completed ? 'text.secondary' : 'text.primary',
                                              fontWeight: task.critical ? 600 : 'normal'
                                            }}
                                          />
                                          {task.critical && (
                                            <Chip label="Critique" size="small" color="error" variant="outlined" />
                                          )}
                                        </ListItem>
                                      ))}
                                    </List>
                                  </CardContent>
                                </Card>
                              </Grid>
                              
                              {/* Documents */}
                              <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                  <CardHeader
                                    title="Documents"
                                    avatar={<Description color="primary" />}
                                    subheader={`${row.documents.filter(d => d.url).length} document(s) disponible(s)`}
                                  />
                                  <CardContent>
                                    {row.documents.map((doc, idx) => (
                                      <Box
                                        key={idx}
                                        display="flex"
                                        alignItems="center"
                                        gap={2}
                                        p={1.5}
                                        mb={1}
                                        sx={{
                                          borderRadius: 1,
                                          bgcolor: doc.url ? 'background.paper' : 'grey.100',
                                          border: `1px solid ${theme.palette.divider}`
                                        }}
                                      >
                                        {getDocumentIcon(doc.type)}
                                        <Box flexGrow={1}>
                                          <Typography variant="body2" fontWeight={500}>
                                            {doc.name}
                                          </Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            {doc.url ? 'Prêt à télécharger' : 'En attente'}
                                          </Typography>
                                        </Box>
                                        {doc.url ? (
                                          <Button
                                            variant="outlined"
                                            size="small"
                                            component="a"
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            startIcon={<AttachFile />}
                                          >
                                            Ouvrir
                                          </Button>
                                        ) : (
                                          <Chip label="Manquant" size="small" color="warning" />
                                        )}
                                      </Box>
                                    ))}
                                  </CardContent>
                                </Card>
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </Box>
                    </Box>
                  </React.Fragment>
                ))}
              </Box>
            </Box>
          </Paper>
        ) : (
          <Card variant="outlined" sx={{ textAlign: 'center', p: 4, borderRadius: 3 }}>
            <Box display="flex" flexDirection="column" alignItems="center">
              <img
                src="/images/empty-state.svg"
                alt="Aucun onboarding"
                style={{ width: 200, marginBottom: 24 }}
              />
              <Typography variant="h6" gutterBottom>
                Aucun onboarding trouvé
              </Typography>
              <Typography color="textSecondary" paragraph>
                {searchTerm
                  ? "Aucun résultat pour votre recherche."
                  : "Commencez par créer un nouvel onboarding."}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                component={Link}
                to="/onboarding/new"
                sx={{ mt: 2 }}
              >
                Créer un onboarding
              </Button>
            </Box>
          </Card>
        )}

        {/* Menu actions */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              boxShadow: 3,
              borderRadius: 2,
              minWidth: 200,
              '& .MuiMenuItem-root': {
                px: 2,
                py: 1,
              }
            }
          }}
        >
          <MenuItem onClick={() => { navigate(`/onboarding/${selectedRow._id}`); handleMenuClose(); }}>
            <ListItemIcon><Email fontSize="small" /></ListItemIcon>
            <ListItemText>Envoyer rappel</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { navigate(`/onboarding/edit/${selectedRow._id}`); handleMenuClose(); }}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setSelectedOnboardingId(selectedRow._id);
              setDeleteDialogOpen(true);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Supprimer</ListItemText>
          </MenuItem>
        </Menu>

        {/* Filtres */}
        <Drawer
          anchor="right"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              p: 3,
              borderRadius: '16px 0 0 16px'
            }
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" fontWeight={600}>Filtres</Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)}>
              <ExpandMore />
            </IconButton>
          </Box>
          
          <Typography variant="subtitle2" color="textSecondary" mb={1}>
            Statut
          </Typography>
          <List dense>
            {["Tous", "En cours", "En attente", "Terminé"].map((status) => (
              <ListItem
                key={status}
                button
                onClick={() => setStatusFilter(status)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  backgroundColor: statusFilter === status ? 'action.selected' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemText
                  primary={status}
                  primaryTypographyProps={{
                    fontWeight: statusFilter === status ? 600 : 'normal'
                  }}
                />
                {statusFilter === status && <CheckCircle color="primary" fontSize="small" />}
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle2" color="textSecondary" mb={1}>
            Autres filtres
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            size="small"
            sx={{ mb: 1 }}
          >
            Contrat signé
          </Button>
          <Button
            variant="outlined"
            fullWidth
            size="small"
          >
            Tâches critiques
          </Button>
        </Drawer>

        {/* Dialogs */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
            Confirmer la suppression
          </DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            <DialogContentText>
              Êtes-vous sûr de vouloir supprimer définitivement cet onboarding ? Cette action ne peut pas être annulée.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              sx={{ borderRadius: 2 }}
            >
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            severity={snackbar.severity}
            sx={{
              width: '100%',
              borderRadius: 3,
              boxShadow: 3,
              alignItems: 'center'
            }}
            variant="filled"
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
        
        {/* Bouton flottant pour mobile */}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="add"
            component={Link}
            to="/onboarding/new"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default Onboarding;