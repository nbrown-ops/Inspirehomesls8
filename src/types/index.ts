// =============================================
// INSPIRE HOMES — TypeScript Types
// Mirrors the Supabase database schema
// =============================================

export type UserRole = 'super_admin' | 'manager' | 'staff' | 'social_worker' | 'auditor'

export type ServiceUserStatus = 'active' | 'discharged' | 'on_leave' | 'hospital' | 'missing'

export type PlacementType = 'supported_living' | 'semi_independent' | 'emergency' | 'respite'

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export type IncidentStatus = 'open' | 'under_review' | 'closed' | 'referred'

export type CarePlanStatus = 'draft' | 'active' | 'under_review' | 'archived'

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'night' | 'waking_night' | 'sleep_in'

export type DocumentType =
  | 'referral_pack'
  | 'care_plan'
  | 'risk_assessment'
  | 'pathway_plan'
  | 'court_order'
  | 'placement_agreement'
  | 'health_assessment'
  | 'education_plan'
  | 'dbs_certificate'
  | 'training_certificate'
  | 'id_document'
  | 'correspondence'
  | 'photo_id'
  | 'other'

export type AlertType =
  | 'incident_flagged'
  | 'medication_overdue'
  | 'document_expiring'
  | 'dbs_expiring'
  | 'care_plan_review_due'
  | 'missing_person'
  | 'safeguarding'
  | 'handover_unacknowledged'
  | 'other'

export type MeetingType =
  | 'looked_after_child_review'
  | 'pathway_planning'
  | 'key_work_session'
  | 'professionals_meeting'
  | 'supervision'
  | 'team_meeting'
  | 'risk_assessment_review'
  | 'mental_health_review'
  | 'other'

export type InteractionType =
  | 'key_work_session'
  | 'welfare_check'
  | 'medication_prompt'
  | 'activity'
  | 'community_activity'
  | 'appointment'
  | 'medical_appointment'
  | 'phone_call'
  | 'visit'
  | 'incident'
  | 'handover'
  | 'safeguarding_concern'
  | 'positive_achievement'
  | 'other'

// =============================================
// TABLE TYPES
// =============================================

export interface Home {
  id: string
  name: string
  address: string
  city: string
  postcode: string
  phone: string | null
  manager_id: string | null
  ofsted_urn: string | null
  max_occupancy: number
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  preferred_name: string | null
  role: UserRole
  job_title: string | null
  phone: string | null
  photo_url: string | null
  employment_start_date: string | null
  dbs_certificate_number: string | null
  dbs_issue_date: string | null
  dbs_expiry_date: string | null
  dbs_update_service: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceUser {
  id: string
  home_id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  date_of_birth: string
  gender: string | null
  pronouns: string | null
  photo_url: string | null
  nationality: string | null
  ethnicity: string | null
  first_language: string | null
  religion: string | null
  placement_start_date: string
  placement_end_date: string | null
  status: ServiceUserStatus
  placement_type: PlacementType
  room_number: string | null
  local_authority: string | null
  legal_status: string | null
  is_asylum_seeker: boolean
  has_mental_capacity: boolean
  mca_assessment_date: string | null
  nhs_number: string | null
  gp_name: string | null
  gp_practice: string | null
  gp_phone: string | null
  gp_address: string | null
  blood_type: string | null
  allergies: string[] | null
  medical_conditions: string[] | null
  key_worker_id: string | null
  nok_name: string | null
  nok_relationship: string | null
  nok_phone: string | null
  nok_email: string | null
  nok_address: string | null
  nok_is_emergency_contact: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  home_id: string
  staff_id: string
  shift_type: ShiftType
  start_time: string
  end_time: string | null
  notes: string | null
  concerns: string | null
  signed_off_by: string | null
  signed_off_at: string | null
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: string
  home_id: string
  service_user_id: string
  shift_id: string | null
  written_by: string
  log_date: string
  mood_rating: 1 | 2 | 3 | 4 | 5 | null
  mood_notes: string | null
  physical_health: string | null
  sleep_quality: string | null
  appetite: string | null
  activities: string | null
  community_access: boolean
  education_work: string | null
  medication_notes: string | null
  medication_refused: boolean
  concerns: string | null
  is_flagged: boolean
  flagged_reason: string | null
  is_confidential: boolean
  created_at: string
}

export interface IncidentReport {
  id: string
  home_id: string
  service_user_id: string | null
  reported_by: string
  incident_date: string
  incident_time: string | null
  location: string | null
  incident_type: string
  severity: IncidentSeverity
  status: IncidentStatus
  description: string
  immediate_action: string | null
  injuries_sustained: boolean
  injury_details: string | null
  police_notified: boolean
  police_reference: string | null
  social_worker_notified: boolean
  manager_notified: boolean
  parent_nok_notified: boolean
  ofsted_reportable: boolean
  ofsted_notified_at: string | null
  follow_up_required: boolean
  follow_up_notes: string | null
  manager_sign_off: string | null
  manager_sign_off_at: string | null
  manager_comments: string | null
  closed_at: string | null
  closed_by: string | null
  created_at: string
  updated_at: string
}

export interface InteractionTimelineEntry {
  id: string
  service_user_id: string
  home_id: string
  staff_id: string
  interaction_type: InteractionType
  occurred_at: string
  duration_minutes: number | null
  notes: string | null
  outcome: string | null
  is_flagged: boolean
  flagged_reason: string | null
  linked_incident_id: string | null
  linked_shift_id: string | null
  created_at: string
}

export interface Document {
  id: string
  home_id: string
  service_user_id: string | null
  document_type: DocumentType
  title: string
  description: string | null
  file_url: string
  file_name: string
  file_size_bytes: number | null
  mime_type: string | null
  document_date: string | null
  expiry_date: string | null
  created_by: string
  countersigned_by: string | null
  countersigned_at: string | null
  is_confidential: boolean
  created_at: string
  updated_at: string
}

export interface HandoverNote {
  id: string
  home_id: string
  outgoing_shift_id: string | null
  incoming_shift_id: string | null
  outgoing_staff_id: string
  incoming_staff_id: string | null
  handover_time: string
  summary: string
  urgent_actions: string | null
  medication_notes: string | null
  incidents_summary: string | null
  is_acknowledged: boolean
  acknowledged_at: string | null
  acknowledged_by: string | null
  created_at: string
}

export interface Meeting {
  id: string
  home_id: string
  service_user_id: string | null
  meeting_type: MeetingType
  title: string
  scheduled_at: string
  location: string | null
  minutes: string | null
  action_points: MeetingActionPoint[] | null
  chaired_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface MeetingActionPoint {
  task: string
  assigned_to: string | null
  due_date: string | null
  completed: boolean
}

export interface Alert {
  id: string
  home_id: string
  alert_type: AlertType
  title: string
  message: string | null
  service_user_id: string | null
  incident_id: string | null
  document_id: string | null
  medication_id: string | null
  handover_id: string | null
  profile_id: string | null
  triggered_at: string
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  created_at: string
}

export interface Medication {
  id: string
  service_user_id: string
  home_id: string
  medication_name: string
  generic_name: string | null
  dose: string
  route: string
  frequency: string
  prescribed_by: string | null
  pharmacy: string | null
  start_date: string
  end_date: string | null
  is_prn: boolean
  is_controlled: boolean
  is_active: boolean
  storage_instructions: string | null
  special_instructions: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface MarEntry {
  id: string
  medication_id: string
  service_user_id: string
  administered_by: string
  administered_at: string
  dose_given: string
  outcome: 'administered' | 'refused' | 'omitted' | 'not_available'
  refusal_reason: string | null
  omission_reason: string | null
  notes: string | null
  witnessed_by: string | null
  created_at: string
}

export interface CarePlan {
  id: string
  service_user_id: string
  home_id: string
  title: string
  plan_type: string
  content: Record<string, unknown> | null
  status: CarePlanStatus
  review_date: string | null
  last_reviewed_by: string | null
  last_reviewed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// Extended profile with home assignments — used by useUser hook and auth context
export interface UserProfile extends Profile {
  home_ids: string[]
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}
