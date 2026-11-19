import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import humanizeDuration from 'humanize-duration'
import {useAuth,useUser} from '@clerk/clerk-react'

export const AppContext=createContext();

export const AppContextProvider = (props)=>{

    const currency=import.meta.env.VITE_CURRENCY
    const navigate=useNavigate();

    const {getToken}=useAuth()
    const {user}=useUser()

    const [allCourses,setAllCourses]=useState([])
    const [isEducator,setisEducator]=useState(false)
    const [enrolledCourses,setEnrolledCourses]=useState([])
    const [userData,setUserData]=useState(null)

    const backendUrl=import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

    //helper: call the backend (JSON or FormData) with the Clerk token attached when logged in
    const apiFetch=async (path,{method='GET',body,formData}={})=>{
        const headers={}
        const token=await getToken()
        if(token) headers.Authorization=`Bearer ${token}`
        let payload
        if(formData){
            payload=formData
        } else if(body){
            headers['Content-Type']='application/json'
            payload=JSON.stringify(body)
        }
        const res=await fetch(`${backendUrl}${path}`,{method,headers,body:payload})
        return res.json()
    }


    //fetch all courses
    const fetchAllCourses=async () =>{
        try {
            const data=await apiFetch('/api/course/all')
            if(data.success){
                setAllCourses(data.courses)
            } else {
                console.error(data.message)
            }
        } catch (error) {
            console.error(error.message)
        }
    }

    //fetch user data
    const fetchUserData=async ()=>{
        if(user?.publicMetadata?.role==='educator'){
            setisEducator(true)
        } else {
            setisEducator(false)
        }
        try {
            const data=await apiFetch('/api/user/data')
            if(data.success){
                setUserData(data.user)
            } else {
                console.error(data.message)
            }
        } catch (error) {
            console.error(error.message)
        }
    }

    //become educator
    const becomeEducator=async ()=>{
        try {
            const data=await apiFetch('/api/educator/update-role')
            if(data.success){
                await user.reload()
                setisEducator(true)
                navigate('/educator')
            } else {
                alert(data.message)
            }
        } catch (error) {
            alert(error.message)
        }
    }

    //function to calculate average rating of course
    const calculateRating=(course)=>{
        if(course.courseRatings.length === 0){
            return 0;
        }
        let totalRating=0
        course.courseRatings.forEach(rating => {
            totalRating+=rating.rating
        })
        return totalRating/course.courseRatings.length
    }

    //Function to calculate Course Chapter Time
    const calculateChapterTime=(chapter)=>{
        let time=0;
        chapter.chapterContent.map((lecture) => time += lecture.lectureDuration)
        return humanizeDuration(time*60*1000,{units:["h","m"]})
    }

    //Function to calculate Course Duration
    const calculateCourseDuration=(course)=>{
        let time =0
        course.courseContent.map((chapter)=> chapter.chapterContent.map(
            (lecture)=> time+= lecture.lectureDuration
        ))
        return humanizeDuration(time*60*1000, {units:["h","m"]})
    }

    //Function to calculate total no of lectures in the course
    const calculateNoOfLectures=(course)=>{
        let totalLectures=0;
        course.courseContent.forEach(chapter => {
            if(Array.isArray(chapter.chapterContent)){
                totalLectures+= chapter.chapterContent.length
            }
        });
        return totalLectures;

    }

    //Fetch User Enrolled Courses
    const fetchUserEnrolledCourses=async ()=>{
        try {
            const data=await apiFetch('/api/user/enrolled-courses')
            if(data.success){
                setEnrolledCourses(data.enrolledCourses.reverse())
            } else {
                console.error(data.message)
            }
        } catch (error) {
            console.error(error.message)
        }
    }

useEffect(()=>{
    fetchAllCourses()
},[])

const logToken=async ()=>{
    console.log(await getToken());
}
useEffect(()=>{
    if(user){
        logToken()
        fetchUserData()
        fetchUserEnrolledCourses()
    } else {
        setisEducator(false)
        setUserData(null)
        setEnrolledCourses([])
    }
},[user])

    const value={
        currency,allCourses,navigate,calculateRating,isEducator,setisEducator,calculateNoOfLectures,calculateCourseDuration
        ,calculateChapterTime,enrolledCourses,fetchUserEnrolledCourses,
        backendUrl,apiFetch,userData,fetchAllCourses,becomeEducator,user
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}