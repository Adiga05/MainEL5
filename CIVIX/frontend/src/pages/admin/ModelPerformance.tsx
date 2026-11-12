import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Cpu, AlertCircle, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ModelPerformance: React.FC = () => {
  const [perfData, setPerfData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPerf() {
      try {
        const res = await dashboardService.getModelPerformance();
        setPerfData(res);
      } catch (err) {
        console.error('Failed to load model performance:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPerf();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Auditing machine learning pipeline & ground-truth validation status..." />;
  }

  const isTrained = perfData?.is_trained || false;
  const featureImp = perfData?.feature_importance || [];

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h2 className="text-base font-bold text-slate-800">Machine Learning Pipeline & Model Evaluation</h2>
        <p className="text-xs text-sky-800 font-medium mt-0.5">
          Supervised disruption prediction architectures, feature importance ranking, and training data integrity
        </p>
      </div>

      {/* Academic Integrity Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-2 shadow-2xs">
        <div className="flex items-center space-x-2 font-bold text-amber-950">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Academic Data Ground Truth Notice:</span>
        </div>
        <p className="leading-relaxed">
          In adherence to academic and scientific research standards, municipal grievance complaints (BBMP SWD records) are <strong>not conflated with road-closure ground truth labels</strong>. Supervised classifiers require systematic, field-verified flood depth or road impassability logs. As such, the system currently utilizes a transparent, physics-based GIS spatial-telemetry risk scoring engine rather than presenting fabricated ML test accuracies.
        </p>
        <div className="text-[11px] text-amber-800 font-medium">
          Status: {perfData?.message}
        </div>
      </div>

      {/* Candidate Model Architectures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900">1. Random Forest Classifier</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              BENCHMARK MODEL
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Ensemble decision tree architecture utilizing class-balanced bootstrap sampling. Acts as the baseline against which tree boosting is measured.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 font-mono text-slate-700">
            <div>n_estimators: 100</div>
            <div>class_weight: 'balanced'</div>
            <div>max_depth: 8</div>
            <div>min_samples_split: 5</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900">2. XGBoost / Gradient Boosting</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              PRIMARY CANDIDATE
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Gradient-boosted decision trees optimized for non-linear interactions between intense precipitation bursts and low-lying topography.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 font-mono text-slate-700">
            <div>n_estimators: 100</div>
            <div>learning_rate: 0.1</div>
            <div>max_depth: 5</div>
            <div>scale_pos_weight: 4.5</div>
          </div>
        </div>
      </div>

      {/* Feature Importance Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Feature Importance Ranking</h3>
        <p className="text-xs text-slate-500 mb-4">
          Relative weight of meteorological, topographical, and infrastructure indicators in road disruption prediction:
        </p>

        <div className="space-y-3">
          {featureImp.map((f: any, idx: number) => (
            <div key={idx} className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-slate-800 font-medium">
                <span>{f.feature}</span>
                <span className="font-bold text-blue-700">{(f.importance * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${f.importance * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

