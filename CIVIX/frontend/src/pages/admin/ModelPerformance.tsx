import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Cpu, AlertCircle, Info, ShieldCheck, CheckCircle2, RefreshCw, Zap } from 'lucide-react';

export const ModelPerformance: React.FC = () => {
  const [perfData, setPerfData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [activeModel, setActiveModel] = useState<string>('xgboost');

  const loadPerf = async () => {
    try {
      const res = await dashboardService.getModelPerformance();
      setPerfData(res);
      if (res?.active_model) {
        setActiveModel(res.active_model);
      }
    } catch (err) {
      console.error('Failed to load model performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerf();
  }, []);

  const handleSelectModel = async (modelKey: string) => {
    try {
      await dashboardService.selectModel(modelKey);
      setActiveModel(modelKey);
      await loadPerf();
    } catch (err) {
      console.error('Failed to select active model:', err);
    }
  };

  const handleRetrain = async () => {
    setTraining(true);
    try {
      await dashboardService.trainModel();
      await loadPerf();
    } catch (err) {
      console.error('Failed to retrain models:', err);
    } finally {
      setTraining(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Auditing machine learning pipeline & ground-truth validation status..." />;
  }

  const featureImp = perfData?.feature_importance || [];
  const models = perfData?.models || {};
  const rf = models?.random_forest || {};
  const xgb = models?.xgboost || {};

  return (
    <div className="space-y-6">
      {/* Header Banner with Retrain Action */}
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-800">Machine Learning Pipeline & Model Evaluation</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              v{perfData?.version || '1.2.0'}
            </span>
          </div>
          <p className="text-xs text-sky-800 font-medium mt-0.5">
            Supervised disruption prediction architectures, feature importance ranking, and model artifact storage
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={training}
          className="flex items-center space-x-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${training ? 'animate-spin' : ''}`} />
          <span>{training ? 'Training Pipeline...' : 'Retrain Pipeline'}</span>
        </button>
      </div>

      {/* Model Status & Methodology Banner */}
      <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 text-xs text-sky-900 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between font-bold text-sky-950">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Operational Machine Learning Pipeline:</span>
          </div>
          <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded-md border border-sky-200 text-sky-800">
            Active: {activeModel.toUpperCase()}
          </span>
        </div>
        <p className="leading-relaxed text-sky-800">
          Trained on the Bommanahalli–Marathahalli corridor road network. Compares an ensemble <strong>Random Forest Benchmark</strong> against a gradient-boosted <strong>XGBoost Candidate</strong>. Artifacts and feature scalers are serialized on disk in <code className="bg-sky-100 px-1 py-0.5 rounded">backend/models/</code>.
        </p>
      </div>

      {/* Candidate Model Architectures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Random Forest Benchmark */}
        <div className={`bg-white/95 p-5 rounded-2xl border shadow-xs space-y-4 transition-all ${
          activeModel === 'random_forest' ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-slate-900 block">1. Random Forest Classifier</span>
              <span className="text-[11px] text-slate-500">Benchmark Model (Bootstrap Ensemble)</span>
            </div>
            <button
              onClick={() => handleSelectModel('random_forest')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeModel === 'random_forest'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {activeModel === 'random_forest' ? '✓ Active Model' : 'Select Model'}
            </button>
          </div>

          <p className="text-xs text-slate-600">
            Ensemble decision tree architecture utilizing class-balanced bootstrap sampling. Acts as the baseline against which tree boosting is measured.
          </p>

          {/* Test Metrics */}
          {rf?.metrics && (
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-medium">PRECISION</span>
                <span className="text-xs font-bold text-slate-800">{rf.metrics.precision}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-medium">RECALL</span>
                <span className="text-xs font-bold text-slate-800">{rf.metrics.recall}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-medium">F1-SCORE</span>
                <span className="text-xs font-bold text-slate-800">{rf.metrics.f1_score}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="block text-[10px] text-slate-400 font-medium">ROC-AUC</span>
                <span className="text-xs font-bold text-slate-800">{rf.metrics.roc_auc}</span>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-mono text-slate-700">
            <div>n_estimators: 100 | max_depth: 8</div>
            <div>class_weight: 'balanced' | random_state: 42</div>
          </div>
        </div>

        {/* XGBoost Candidate */}
        <div className={`bg-white/95 p-5 rounded-2xl border shadow-xs space-y-4 transition-all ${
          activeModel === 'xgboost' ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-slate-900 block">2. XGBoost / Gradient Boosting</span>
              <span className="text-[11px] text-sky-600 font-medium">Primary Candidate Model</span>
            </div>
            <button
              onClick={() => handleSelectModel('xgboost')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeModel === 'xgboost'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {activeModel === 'xgboost' ? '✓ Active Model' : 'Select Model'}
            </button>
          </div>

          <p className="text-xs text-slate-600">
            Gradient-boosted decision trees optimized for non-linear interactions between intense precipitation bursts and low-lying topography.
          </p>

          {/* Test Metrics */}
          {xgb?.metrics && (
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 bg-sky-50 rounded-lg">
                <span className="block text-[10px] text-sky-600 font-medium">PRECISION</span>
                <span className="text-xs font-bold text-sky-900">{xgb.metrics.precision}</span>
              </div>
              <div className="p-2 bg-sky-50 rounded-lg">
                <span className="block text-[10px] text-sky-600 font-medium">RECALL</span>
                <span className="text-xs font-bold text-sky-900">{xgb.metrics.recall}</span>
              </div>
              <div className="p-2 bg-sky-50 rounded-lg">
                <span className="block text-[10px] text-sky-600 font-medium">F1-SCORE</span>
                <span className="text-xs font-bold text-sky-900">{xgb.metrics.f1_score}</span>
              </div>
              <div className="p-2 bg-sky-50 rounded-lg">
                <span className="block text-[10px] text-sky-600 font-medium">ROC-AUC</span>
                <span className="text-xs font-bold text-sky-900">{xgb.metrics.roc_auc}</span>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-mono text-slate-700">
            <div>n_estimators: 100 | learning_rate: 0.1</div>
            <div>max_depth: 5 | random_state: 42</div>
          </div>
        </div>
      </div>

      {/* Feature Importance Breakdown */}
      <div className="bg-white/95 rounded-2xl border border-sky-100 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Feature Importance Ranking</h3>
        <p className="text-xs text-slate-500 mb-4">
          Relative weight of meteorological, topographical, and infrastructure indicators derived from tree split gains:
        </p>

        <div className="space-y-3">
          {featureImp.map((f: any, idx: number) => (
            <div key={idx} className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-slate-800 font-medium">
                <span className="font-mono text-slate-700">{f.feature}</span>
                <span className="font-bold text-sky-700">{(f.importance * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(2, f.importance * 100))}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
