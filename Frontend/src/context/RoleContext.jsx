import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShieldAlert, Building2, MapPin, Briefcase, Scale } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const ROLES = {
  MINISTRY: 'Ministry Nodal Officer',
  STATE: 'State Authority',
  DISTRICT: 'District Authority (IDA)',
  CAG: 'CAG / Field Auditor'
};

export const ROLE_CONFIGS = {
  [ROLES.MINISTRY]: {
    id: 'ministry',
    title: 'Ministry Nodal Officer',
    shortTitle: 'Ministry Officer',
    scope: 'National Purview',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accentColor: 'cyan',
    icon: Building2,
    description: 'National policy, cross-state aggregations, ₹3,350 Cr disbursals, & escalation oversight.',
    defaultTab: 'overview',
    permissions: ['full_view', 'national_analytics', 'policy_escalation', 'export_national']
  },
  [ROLES.STATE]: {
    id: 'state',
    title: 'State Authority',
    shortTitle: 'State Authority',
    scope: 'State Scope',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    accentColor: 'purple',
    icon: MapPin,
    description: 'State-level work administration, district allocation monitoring, & IDA coordination.',
    defaultTab: 'overview',
    permissions: ['state_view', 'district_monitoring', 'assign_ida', 'state_export']
  },
  [ROLES.DISTRICT]: {
    id: 'district',
    title: 'District Authority (IDA)',
    shortTitle: 'District (IDA)',
    scope: 'District Implementation',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentColor: 'amber',
    icon: Briefcase,
    description: 'Ground execution, contractor delays, field inspection updates, & milestone verification.',
    defaultTab: 'projects',
    permissions: ['field_inspection', 'update_notes', 'verify_progress', 'local_alerts']
  },
  [ROLES.CAG]: {
    id: 'cag',
    title: 'CAG / Field Auditor',
    shortTitle: 'CAG Auditor',
    scope: 'Forensic Audit & Vigilance',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    accentColor: 'rose',
    icon: Scale,
    description: 'Independent audit scrutiny: Cost inflation, duplicate works (<500m), & fund-progress gaps.',
    defaultTab: 'risk',
    permissions: ['audit_flagging', 'audit_memo', 'forensic_reports', 'anomaly_drilldown']
  }
};

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [userRole, setUserRoleState] = useState(() => {
    return localStorage.getItem('mplads_user_role') || ROLES.MINISTRY;
  });

  const [selectedState, setSelectedStateState] = useState(() => {
    return localStorage.getItem('mplads_user_state') || 'Uttar Pradesh';
  });

  const [selectedDistrict, setSelectedDistrictState] = useState(() => {
    return localStorage.getItem('mplads_user_district') || '';
  });
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [stateAnalytics, setStateAnalytics] = useState(null);
  const [auditAnalytics, setAuditAnalytics] = useState(null);
  const [loadingRoleData, setLoadingRoleData] = useState(false);

  // Sync role to localStorage
  const setUserRole = (role) => {
    setUserRoleState(role);
    localStorage.setItem('mplads_user_role', role);
  };

  // Sync district to localStorage
  const setSelectedDistrict = (dist) => {
    setSelectedDistrictState(dist);
    if (dist) {
      localStorage.setItem('mplads_user_district', dist);
    } else {
      localStorage.removeItem('mplads_user_district');
    }
  };

  // Sync state to localStorage
  const setSelectedState = (state) => {
    setSelectedStateState(state);
    if (state) {
      localStorage.setItem('mplads_user_state', state);
    } else {
      localStorage.removeItem('mplads_user_state');
    }
    setSelectedDistrict('');
  };

  // Fetch available states on load
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/states`)
      .then((res) => res.json())
      .then((data) => {
        if (data.states && data.states.length > 0) {
          setStatesList(data.states);
          if (!data.states.includes(selectedState)) {
            setSelectedState(data.states[0]);
          }
        }
      })
      .catch((err) => console.error('Error fetching states in RoleContext:', err));
  }, []);

  // Fetch districts when state changes
  useEffect(() => {
    if (!selectedState) return;
    fetch(`${API_BASE_URL}/api/constituencies?state=${encodeURIComponent(selectedState)}`)
      .then((res) => res.json())
      .then((data) => {
        setDistrictsList(data.constituencies || []);
      })
      .catch((err) => console.error('Error fetching constituencies:', err));
  }, [selectedState]);

  // Load role-specific analytics
  useEffect(() => {
    if (userRole === ROLES.STATE && selectedState) {
      setLoadingRoleData(true);
      fetch(`${API_BASE_URL}/api/analytics/state?state=${encodeURIComponent(selectedState)}`)
        .then((res) => res.json())
        .then((data) => setStateAnalytics(data.data || null))
        .catch((err) => console.error('Error fetching state analytics:', err))
        .finally(() => setLoadingRoleData(false));
    } else if (userRole === ROLES.CAG) {
      setLoadingRoleData(true);
      fetch(`${API_BASE_URL}/api/analytics/audit`)
        .then((res) => res.json())
        .then((data) => setAuditAnalytics(data.data || null))
        .catch((err) => console.error('Error fetching audit analytics:', err))
        .finally(() => setLoadingRoleData(false));
    }
  }, [userRole, selectedState]);

  const currentConfig = ROLE_CONFIGS[userRole] || ROLE_CONFIGS[ROLES.MINISTRY];

  return (
    <RoleContext.Provider
      value={{
        userRole,
        setUserRole,
        currentConfig,
        selectedState,
        setSelectedState,
        selectedDistrict,
        setSelectedDistrict,
        statesList,
        districtsList,
        stateAnalytics,
        auditAnalytics,
        loadingRoleData,
        isMinistry: userRole === ROLES.MINISTRY,
        isStateAuthority: userRole === ROLES.STATE,
        isDistrictAuthority: userRole === ROLES.DISTRICT,
        isCagAuditor: userRole === ROLES.CAG
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
