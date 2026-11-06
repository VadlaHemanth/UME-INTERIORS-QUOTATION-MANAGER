import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {registerHooks} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {DEFAULT_UME_CATALOGUE} from './catalogue';

test('plywood comparison exposes each saved product and warranty without an accordion or invented Basic coverage',async()=>{
  const hook=registerHooks({load(url,context,next){if(url.endsWith('.css'))return{format:'module',source:'export default {}',shortCircuit:true};return next(url,context);}});
  try{
    const {PlywoodSpecifications,plywoodProductDescription}=await import('../components/PlywoodSpecifications');
    const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);
    catalogue.grades.Normal.approvedBrands[0]={...catalogue.grades.Normal.approvedBrands[0],name:'Edited Plywood',spec:'BWR 710 Grade Plywood (20 Years Manufacturer Warranty)',warrantyYears:20};
    const before=structuredClone(catalogue);
    const html=renderToStaticMarkup(<PlywoodSpecifications catalogue={catalogue} grades={['Premium','Normal','Base','Normal']} selectedGrade="Normal"/>);
    assert.doesNotMatch(html,/<details|<summary/);
    assert.equal((html.match(/class="plywood-package"/g)||[]).length,3);
    assert.ok(html.indexOf('Basic Package')<html.indexOf('Standard Package')&&html.indexOf('Standard Package')<html.indexOf('Premium Package'));
    for(const grade of ['Base','Normal','Premium'] as const)for(const brand of catalogue.grades[grade].approvedBrands)assert.ok(html.includes(brand.name));
    assert.ok(html.includes('20 years'));assert.ok(html.includes('30 years'));assert.ok(html.includes('No fixed warranty period listed'));
    assert.equal((html.match(/data-selected="true"/g)||[]).length,1);
    assert.equal(plywoodProductDescription('SMART Series BWP 710 Grade — 30 Yrs Manufacturer Warranty'),'SMART Series BWP 710 Grade');
    assert.deepEqual(catalogue,before);
  }finally{hook.deregister();}
});
