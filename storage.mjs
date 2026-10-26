import {firebaseConfig} from './firebase-config.js';
export const configured=Boolean(firebaseConfig.apiKey&&firebaseConfig.projectId&&firebaseConfig.authDomain&&firebaseConfig.appId);
const localKey='fars-circus-demo-v1';
function readLocal(){try{return JSON.parse(localStorage.getItem(localKey))||{nickname:'Гость цирка',seasons:[]};}catch{return {nickname:'Гость цирка',seasons:[]};}}
function writeLocal(v){localStorage.setItem(localKey,JSON.stringify(v));}
export function localStorageApi(){
  return {
    mode:'demo',
    async profile(){return {nickname:readLocal().nickname};},
    async saveProfile(nickname){let v=readLocal();v.nickname=nickname;writeLocal(v);},
    async list(){return readLocal().seasons;},
    async save(season){let v=readLocal();v.seasons=[...v.seasons.filter(s=>s.id!==season.id),season];writeLocal(v);},
    async remove(id){let v=readLocal();v.seasons=v.seasons.filter(s=>s.id!==id);writeLocal(v);}
  };
}
export async function connectFirebase(){
  const root='https://www.gstatic.com/firebasejs/13.1.0/';
  const [appModule,authModule,dbModule]=await Promise.all([
    import(root+'firebase-app.js'),import(root+'firebase-auth.js'),import(root+'firebase-firestore.js')
  ]);
  const app=appModule.initializeApp(firebaseConfig);
  const auth=authModule.getAuth(app);const db=dbModule.getFirestore(app);
  const {onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,updateProfile}=authModule;
  const {doc,setDoc,getDoc,getDocs,collection,deleteDoc}=dbModule;
  const getStore=()=>{
    if(!auth.currentUser)throw new Error('Сначала войди в аккаунт.');
    const uid=auth.currentUser.uid;
    const profileRef=doc(db,'streamers',uid);
    const seasonRef=id=>doc(db,'streamers',uid,'seasons',id);
    return {
      mode:'firebase',uid,
      async publish(season,nickname){await setDoc(doc(db,'publicSeasons',uid+'_'+season.id),{ownerUid:uid,seasonId:season.id,nickname:nickname.slice(0,64),name:season.name,theme:season.theme,position:season.position,phase:season.phase,tickets:season.tickets,completed:season.completed,lastEvent:season.lastEvent,currentTask:season.currentTask,updatedAt:Date.now()});},
      async unpublish(season){await deleteDoc(doc(db,'publicSeasons',uid+'_'+season.id));},
      async profile(){const snap=await getDoc(profileRef);return snap.exists()?snap.data():{nickname:auth.currentUser.displayName||'Стример'};},
      async saveProfile(nickname){await setDoc(profileRef,{nickname:nickname.slice(0,64),createdAt:Date.now()},{merge:true});await updateProfile(auth.currentUser,{displayName:nickname.slice(0,64)});},
      async list(){const snap=await getDocs(collection(db,'streamers',uid,'seasons'));return snap.docs.map(s=>s.data());},
      async save(season){await setDoc(seasonRef(season.id),season);},
      async remove(id){await deleteDoc(seasonRef(id));}
    };
  };
  return {
    observe(callback){return onAuthStateChanged(auth,callback);},
    async login(email,password){return signInWithEmailAndPassword(auth,email,password);},
    async register(email,password,nickname){const cr=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(cr.user,{displayName:nickname});await setDoc(doc(db,'streamers',cr.user.uid),{nickname,createdAt:Date.now()});return cr;},
    async reset(email){return sendPasswordResetEmail(auth,email);},
    async logout(){return signOut(auth);},
    getStore
  };
}
