const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()
const userModel = require("./models/user.model")
const postModel = require("./models/post.model")
const path = require("path")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require('crypto')
const multer = require("multer")


app.use(cookieParser())
app.set("view engine","ejs")
app.use(express.json())
app.use(express.urlencoded({extended : true}))
app.use(express.static(path.join(__dirname , "public")))

//------------------------->MULTER MIDDLEWARE<----------------------------- 


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12 , (err , bytes)=>{
            const fn = bytes.toString("hex") + path.extname(file.originalname)
            cb(null, fn)
        })
    }
})

const upload = multer({ storage: storage })


//------------------------->ISLOGGEDIN<-----------------------------

const isLoggedIn = (req,res,next)=>{
    if(req.cookies.token ===""){
        res.redirect("/login")
    }
    else{
        let data = jwt.verify(req.cookies.token , "secret")
        // console.log(data)
        req.user = data
        // console.log(req.user)
        next();
    }
}

app.get("/",(req,res)=>{
    res.render("index")
})

app.post("/register", async (req,res)=>{
    let {username , name , email ,age , password } = req.body

    const user = await userModel.findOne({email : email })
    if(user) return res.send("user already register ")
        
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            const createdUser = await  userModel.create({
                username : username,
                email : email,
                password : hash,
                age : age,
                name : name 
            })

            const token = jwt.sign({email : email , userid : createdUser._id} , "secret")
            // console.log(token)
            
            res.cookie("token",token)

            res.send(createdUser)
        });
    });
})

app.get("/login",(req,res)=>{
    res.render("login")
})

app.get("/upload",(req,res)=>{
    res.render("upload")
})

app.post("/upload",  upload.single("image") ,(req,res)=>{
    // console.log(req.file)
    res.redirect("/upload")
})

app.get("/profile/upload",(req,res)=>{
    res.render("profilepic")
})

app.post("/profile/upload", isLoggedIn , upload.single("profileImage") , async (req,res)=>{
    const user = await userModel.findOne({email : req.user.email})
    user.profilepic = req.file.filename
    await user.save()
    res.redirect("/profile")
    // console.log(req.file.filename)
})

app.post("/logining", async (req,res)=>{
    let {username , password } = req.body
    
    let user = await userModel.findOne({username : username})
    // console.log(user)
    
    if(user.length < 1){
        res.send("something went wrong")
    }
    else {
        let hash = user.password
        // res.send(hash)
        bcrypt.compare(password, hash , function(err, result) {
            if(result){
                const token = jwt.sign({email : user.email , userid : user._id} , "secret")            
                res.cookie("token",token)
                res.redirect("/profile")
                // console.log(token)
            }
            else{
                res.send("incorrect password")
            }
        });
    }
    
})

app.get("/profile", isLoggedIn , async (req,res) =>{
    let user = await userModel.findOne({email : req.user.email}).populate("posts")
    // console.log(user)
    // user.populate("posts")
    res.render("profile" , {user : user})

})

app.get("/like/:id", isLoggedIn , async (req,res)=>{
    let post = await postModel.findOne({_id : req.params.id}).populate("user")
    
    // console.log(req.user)

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid)
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid) , 1)
    }

    await post.save()
    res.redirect("/profile")
})

app.get("/edit/:id", isLoggedIn , async (req,res)=>{
    let post = await postModel.findOne({_id : req.params.id}).populate("user")
    // console.log(post)    
    res.render("edit" , {post})
})

app.post("/update/:id", async (req,res)=>{
    let post = await postModel.findOneAndUpdate({_id : req.params.id} , {content : req.body.content})
    // console.log(post.content)
    res.redirect("/profile")
})

app.get("/delete/:id", async (req,res)=>{
    let post = await postModel.findOneAndDelete({_id : req.params.id})
    res.redirect("/profile")
})

app.post("/post", isLoggedIn , async (req,res)=>{
    let user = await userModel.findOne({email : req.user.email})
    let { content } = req.body
    let createdPost = await postModel.create({
        user : user._id,
        content : content
    })
//--------------------------------------------------------------------- 
//--------------------------------------------------------------------- 
    user.posts.push(createdPost._id)
    await user.save()
//--------------------------------------------------------------------- 
//--------------------------------------------------------------------- 

    // console.log(user);
    // console.log(createdPost)
})

app.get("/logout",(req,res)=>{
    res.cookie("token" , "")
    res.redirect("/login")
})

app.get("/cookie",(req,res)=>{
    res.send(req.cookies)
    // let data = jwt.verify(req.cookies.token , "secret")
    // console.log(data)
})









app.listen(3000)