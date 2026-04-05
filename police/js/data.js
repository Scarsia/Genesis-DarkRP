window.__mdtModule('data', function(){

// ════════════════════════════════════════════════════════════════
// DONNÉES CHARGES
// ════════════════════════════════════════════════════════════════
window.CHARGES = [
  {id:"assault_1",label:"Coups et blessures au 1er degré",time:600,fine:5000,cat:"Violent"},
  {id:"assault_2",label:"Coups et blessures au 2e degré",time:300,fine:2500,cat:"Violent"},
  {id:"robbery",label:"Braquage / Vol avec violence",time:900,fine:10000,cat:"Violent"},
  {id:"murder_1",label:"Meurtre au 1er degré",time:3600,fine:50000,cat:"Violent"},
  {id:"murder_2",label:"Meurtre au 2e degré",time:1800,fine:25000,cat:"Violent"},
  {id:"threat",label:"Menaces criminelles",time:180,fine:1500,cat:"Violent"},
  {id:"possession",label:"Port d'arme illégal",time:600,fine:5000,cat:"Armes"},
  {id:"concealed",label:"Port dissimulé sans permis",time:480,fine:3000,cat:"Armes"},
  {id:"drug_pos",label:"Possession de stupéfiants",time:300,fine:2000,cat:"Stupéfiants"},
  {id:"drug_traf",label:"Trafic de stupéfiants",time:1200,fine:15000,cat:"Stupéfiants"},
  {id:"theft_gran",label:"Vol aggravé",time:600,fine:7500,cat:"Propriété"},
  {id:"theft_petty",label:"Vol simple",time:120,fine:500,cat:"Propriété"},
  {id:"vandalism",label:"Dégradation de biens",time:120,fine:1000,cat:"Propriété"},
  {id:"trespass",label:"Violation de domicile",time:90,fine:500,cat:"Propriété"},
  {id:"evade",label:"Fuite devant les forces de l'ordre",time:360,fine:2000,cat:"Circulation"},
  {id:"reckless",label:"Conduite dangereuse",time:120,fine:1500,cat:"Circulation"},
  {id:"dui",label:"Conduite sous influence (DUI)",time:240,fine:3000,cat:"Circulation"},
  {id:"resist",label:"Résistance à l'arrestation",time:180,fine:1000,cat:"Obstruction"},
  {id:"obstruct",label:"Obstruction à la justice",time:300,fine:2500,cat:"Obstruction"},
  {id:"corrupt",label:"Corruption d'agent public",time:720,fine:20000,cat:"Corruption"},
];
window.CAT_COLORS={"Violent":"cat-violent","Armes":"cat-weapons","Stupéfiants":"cat-narcotics","Propriété":"cat-property","Circulation":"cat-traffic","Obstruction":"cat-obstruction","Corruption":"cat-corruption"};

// ════════════════════════════════════════════════════════════════
// DONNÉES CITOYENS (injectées par Lua via window.__mdt_citizens)
// Format : [{id, firstname, lastname, dob, phone, steamid64,
//            height, weight, gender, hair, eyes, ethnicity,
//            address, job,
//            license_drive, ppa_civil, ppa_hunt, wanted, deceased,
//            arrests:[{report_number,date,charges,total_time,total_fine,precinct}],
//            complaints:[{id,date,type,description,status}],
//            depositions:[{id,date,description}],
//            bracelets:[{id,date,expiry,reason,status}]
//           }]
// ════════════════════════════════════════════════════════════════
window.CITIZENS = window.CITIZENS || [];
// Les citoyens sont chargés dynamiquement via window.__mdt_set_citizens()
// injecté par cl_citizens.lua → MDT.InjectCitizens(json) → RunJavascript()
// ════════════════════════════════════════════════════════════════

});
