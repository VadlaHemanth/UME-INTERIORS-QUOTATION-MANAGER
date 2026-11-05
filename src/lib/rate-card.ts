import type { StudioCatalogue, WorkTypeDefinition } from './catalogue';
import type { PlywoodGrade } from './schema';

/** Owner-confirmed defaults, 5 November 2026. All amounts are per sq.ft. */
export const APPROVED_CORE_RATES: Record<string,readonly [number,number,number,number]> = {
  'Box type':[950,1150,1350,100],
  'Frame type':[750,900,1050,60],
  'Loft - frame and shutter':[750,900,1050,75],
  'Low roof - frame and shutter':[750,900,1050,75],
  'Folding table':[700,800,1000,0],
  'Wood wall paneling':[400,500,550,150],
  'Wood wall paneling (under wall cabinet)':[400,500,550,150],
  'Pooja CNC / glass door paneling':[700,800,850,0],
};
export const FRAME_RATE_WORK_TYPES=['Frame type','Loft - frame and shutter','Low roof - frame and shutter'];
export const OTHER_CORE_WORK_TYPES=['Additional internal drawer','Louvers wall paneling','Tandem or SS baskets','Wall mount bed','Mirror wall paneling','False ceiling (Saint Gobain)'];
export function packageRates(basic:number,standard:number,premium:number,pvcExtra=0):WorkTypeDefinition['rates'] {
  return {Base:{Standard:basic,'With PVC':basic+pvcExtra},Normal:{Standard:standard,'With PVC':standard+pvcExtra},Premium:{Standard:premium,'With PVC':premium+pvcExtra}};
}
export function applyApprovedCoreRates(catalogue:StudioCatalogue):StudioCatalogue {
  for(const [key,amounts] of Object.entries(APPROVED_CORE_RATES)) {
    const work=catalogue.workTypes[key];if(!work)continue;
    work.rates=packageRates(...amounts);work.pvcDefaultEligible=amounts[3]>0;
  }
  for(const key of OTHER_CORE_WORK_TYPES) {
    const work=catalogue.workTypes[key];if(!work)continue;
    for(const grade of ['Base','Normal','Premium'] as const)work.rates[grade]['With PVC']=work.rates[grade].Standard;
    work.pvcDefaultEligible=false;
  }
  return catalogue;
}
/** Frame, loft and low-roof closures share base rates, but have different PVC extras. */
export function editPackageRate(catalogue:StudioCatalogue,key:string,grade:PlywoodGrade,amount:number):StudioCatalogue {
  const next=structuredClone(catalogue);
  const keys=FRAME_RATE_WORK_TYPES.includes(key)?FRAME_RATE_WORK_TYPES:[key];
  for(const targetKey of keys){const work=next.workTypes[targetKey];if(!work)continue;const extra=Math.max(0,work.rates[grade]['With PVC']-work.rates[grade].Standard);work.rates[grade]={Standard:amount,'With PVC':amount+extra};}
  return next;
}
