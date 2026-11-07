import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {registerHooks} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {DEFAULT_UME_CATALOGUE} from './catalogue';

test('plywood comparison exposes each saved product and warranty without an accordion or invented Basic coverage',async()=>{
  const hook=registerHooks({load(url,context,next){if(url.endsWith('.css'))return{format:'module',source:'export default {}',shortCircuit:true};return next(url,context);}});
  try{
    const {PlywoodSpecifications,plywoodProductDescription,compactPlywoodProduct}=await import('../components/PlywoodSpecifications');
    const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);
    catalogue.grades.Normal.approvedBrands[0]={...catalogue.grades.Normal.approvedBrands[0],name:'Edited Plywood',spec:'BWR 710 Grade Plywood (20 Years Manufacturer Warranty)',warrantyYears:20};
    const before=structuredClone(catalogue);
    const html=renderToStaticMarkup(<PlywoodSpecifications catalogue={catalogue} grades={['Premium','Normal','Base','Normal']} selectedGrade="Normal"/>);
    assert.doesNotMatch(html,/<details|<summary/);
    assert.equal((html.match(/class="plywood-package"/g)||[]).length,3);
    assert.ok(html.indexOf('<h3>Basic')<html.indexOf('<h3>Standard')&&html.indexOf('<h3>Standard')<html.indexOf('<h3>Premium'));
    for(const grade of ['Base','Normal','Premium'] as const)for(const brand of catalogue.grades[grade].approvedBrands)assert.ok(html.includes(brand.name));
    assert.ok(html.includes('20 years'));assert.ok(html.includes('30 years'));assert.ok(html.includes('Warranty under manufacturer terms'));
    assert.equal((html.match(/class="plywood-package" data-selected="true"/g)||[]).length,1);
    assert.ok(html.includes('<strong>Godrej</strong> · <strong>Berlin</strong> · <strong>Ebco</strong> · <strong>Nimmi</strong>'));
    assert.ok(html.includes('<strong>Hettich</strong> · <strong>Sleek</strong> · <strong>Godrej</strong>'));
    assert.match(html,/Hardware brands included/);assert.doesNotMatch(html,/preferred order|priority order/i);
    const print=renderToStaticMarkup(<PlywoodSpecifications catalogue={catalogue} grades={['Base','Normal','Premium']} print/>);
    assert.match(print,/plywood-print/);assert.doesNotMatch(print,/Swipe across/);
    for(const grade of ['Base','Normal','Premium'] as const)for(const brand of catalogue.grades[grade].approvedBrands)assert.ok(print.includes(brand.name));
    assert.equal(plywoodProductDescription('SMART Series BWP 710 Grade — 30 Yrs Manufacturer Warranty'),'SMART Series BWP 710 Grade');
    assert.deepEqual(compactPlywoodProduct({name:'Flaer Ply (SMART)',spec:'SMART Series BWP 710 Grade — 30 Yrs Manufacturer Warranty',warrantyYears:30}),{name:'Flaer Ply (SMART)',spec:'BWP 710 Grade'});
    assert.deepEqual(compactPlywoodProduct({name:'BWR 710 Grade (15 Yrs)',spec:'BWR 710 Grade Plywood',warrantyYears:15}),{name:'BWR 710 Grade',spec:'BWR 710 Grade'});
    assert.deepEqual(catalogue,before);
  }finally{hook.deregister();}
});
