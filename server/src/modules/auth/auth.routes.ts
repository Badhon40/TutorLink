import { Router } from "express";
import { register, login, logout } from "./auth.controller";
import { catchAsync } from "../../utils/catchAsync";
import { refresh } from "./auth.controller";
import { authenticate} from "../../middlewares/auth.middleware";
import { getMe } from "./auth.me.controller";

const router = Router();

router.post("/register", catchAsync(register));
router.post("/login", catchAsync(login));
router.post("/refresh", catchAsync(refresh));
router.post("/logout", catchAsync(logout));
router.get("/me", authenticate, catchAsync(getMe));



export default router;