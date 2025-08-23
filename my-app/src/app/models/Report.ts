import { Schema, model, models } from 'mongoose';

const ReportSchema = new Schema({
  species: {
    scientific_name: String,
    genus: String,
    species_epithet: String,
    subspecies: String,
    common_name: String,
    other_common_names: [String],
    confidence: Number,
    taxonomy: {
      class: String,
      order: String,
      family: String,
    },
    distinguishing_features: [String],
    similar_candidates: [
      {
        scientific_name: String,
        common_name: String,
        confidence: Number,
        why_not: String,
      },
    ],
  },

  conservation: {
    iucn_status: String,
    protected_status: String,
  },

  danger_profile: {
    is_venomous: Boolean,
    is_poisonous: Boolean,
    toxicity_level: { type: Schema.Types.Mixed, default: null },
    primary_toxins: [String],
    threat_to_humans: String,
    evidence: String,
  },

  health_indicators: {
    age_sex: { type: Schema.Types.Mixed, default: null },
    visible_injuries: [String],
    condition: String,
  },

  habitat_context: {
    environment: String,
    human_impact: { type: Schema.Types.Mixed, default: null },
  },

  threat_analysis: {
    illegal_activity_detected: Boolean,
    evidence: [String],
    weapons_traps: [String],
    suspicious_activity: [String],
  },

  risk_assessment: {
    level: Number,
    justification: String,
    urgency: String,
  },

  recommended_actions: [String],

  metadata: {
    analysis_type: String,
    timestamp: Date,
    source: String,
    model: String,
    universal_detector: {
      detected_file_type: String,
      analysis_timestamp: Date,
      file_info: {
        path: String,
        name: String,
        size_bytes: Number,
        size_mb: Number,
        extension: String,
        created: Date,
        modified: Date,
      },
      version: String,
    },
  },

  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'report-analysis' // this is crucial!
});

export default models.Report || model('Report', ReportSchema);
