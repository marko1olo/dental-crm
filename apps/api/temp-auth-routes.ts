// ─── SaaS Registration (New Clinic + Owner) ──────────────────────────────────
app.post(
	"/api/auth/register",
	async (request: FastifyRequest, reply: FastifyReply) => {
		const { clinicName, ownerName, email, password } =
			(request.body as any) ?? {};
		if (!clinicName || !ownerName || !email || !password) {
			return reply
				.code(400)
				.send({ error: "ValidationError", message: "Заполните все поля." });
		}
		const loginId = email.toLowerCase().trim();
		const [existingOrg] = await db
			.select({ id: organizations.id })
			.from(organizations)
			.where(eq(organizations.loginId, loginId))
			.limit(1);
		if (existingOrg)
			return reply
				.code(409)
				.send({
					error: "Conflict",
					message: "Организация с таким логином уже существует.",
				});

		const [existingUser] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, loginId))
			.limit(1);
		if (existingUser)
			return reply
				.code(409)
				.send({
					error: "Conflict",
					message: "Пользователь с таким email уже существует.",
				});

		const passwordHash = hashCredential(password);
		const pinCodeHash = hashCredential("0000"); // Default PIN for owner

		const [org] = await db
			.insert(organizations)
			.values({ name: clinicName, loginId, passwordHash, email: loginId })
			.returning();
		const [user] = await db
			.insert(users)
			.values({
				organizationId: org.id,
				fullName: ownerName,
				role: "owner",
				email: loginId,
				passwordHash,
				pinCodeHash,
				isActive: true,
			})
			.returning();

		const token = signToken(
			{
				userId: user.id,
				fullName: user.fullName,
				role: user.role,
				organizationId: org.id,
			},
			TOKEN_SECRET(),
			60 * 60 * 24 * 7,
		);
		return reply
			.code(201)
			.send({
				ok: true,
				staffToken: token,
				organizationId: org.id,
				userId: user.id,
			});
	},
);

// ─── SaaS User Login (Direct user login) ─────────────────────────────────────
app.post(
	"/api/auth/login",
	async (request: FastifyRequest, reply: FastifyReply) => {
		const { email, password } = (request.body as any) ?? {};
		if (!email || !password)
			return reply
				.code(400)
				.send({ error: "ValidationError", message: "Введите email и пароль." });

		const loginEmail = email.toLowerCase().trim();
		const [user] = await db
			.select()
			.from(users)
			.where(and(eq(users.email, loginEmail), eq(users.isActive, true)))
			.limit(1);
		if (!user || !user.passwordHash) {
			await new Promise((r) => setTimeout(r, 200 + Math.random() * 100));
			return reply
				.code(401)
				.send({ error: "AuthError", message: "Неверный email или пароль." });
		}

		if (!verifyCredential(password, user.passwordHash))
			return reply
				.code(401)
				.send({ error: "AuthError", message: "Неверный email или пароль." });

		const staffToken = signToken(
			{
				userId: user.id,
				fullName: user.fullName,
				role: user.role,
				organizationId: user.organizationId,
			},
			TOKEN_SECRET(),
			60 * 60 * 24 * 7,
		);
		return reply.send({
			ok: true,
			staffToken,
			user: {
				id: user.id,
				fullName: user.fullName,
				role: user.role,
				email: user.email,
			},
		});
	},
);

// ─── SaaS Create Invite ──────────────────────────────────────────────────────
app.post(
	"/api/auth/invites/create",
	async (request: FastifyRequest, reply: FastifyReply) => {
		const { email, role } = (request.body as any) ?? {};
		const staffHeader = request.headers["x-dente-staff-token"];
		const staffToken = Array.isArray(staffHeader)
			? staffHeader[0]
			: staffHeader;
		const staffPayload = staffToken
			? verifyToken(staffToken, TOKEN_SECRET())
			: null;

		if (
			!staffPayload?.organizationId ||
			(staffPayload.role !== "owner" && staffPayload.role !== "admin")
		) {
			return reply
				.code(403)
				.send({
					error: "Forbidden",
					message: "Нет прав на приглашение сотрудников.",
				});
		}
		if (!email || !role)
			return reply
				.code(400)
				.send({ error: "ValidationError", message: "Укажите email и роль." });

		const tokenUuid = crypto.randomUUID();
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

		await db.insert(userInvitations).values({
			organizationId: staffPayload.organizationId as string,
			email: email.toLowerCase().trim(),
			role,
			inviteToken: tokenUuid,
			expiresAt,
			status: "pending",
		});

		return reply.send({ ok: true, inviteLink: `/auth/accept-invite?token=${tokenUuid}` });
	},
);

// ─── SaaS Accept Invite ──────────────────────────────────────────────────────
app.post(
	"/api/auth/invites/accept",
	async (request: FastifyRequest, reply: FastifyReply) => {
		const { token, fullName, password, pinCode } = (request.body as any) ?? {};
		if (!token || !fullName || !password || !pinCode)
			return reply
				.code(400)
				.send({ error: "ValidationError", message: "Заполните все поля." });

		const [invite] = await db
			.select()
			.from(userInvitations)
			.where(
				and(
					eq(userInvitations.inviteToken, token),
					eq(userInvitations.status, "pending"),
				),
			)
			.limit(1);
		if (!invite || new Date() > invite.expiresAt)
			return reply
				.code(400)
				.send({
					error: "InvalidToken",
					message: "Приглашение недействительно или истекло.",
				});

		const passwordHash = hashCredential(password);
		const pinCodeHash = hashCredential(pinCode);

		const [user] = await db
			.insert(users)
			.values({
				organizationId: invite.organizationId,
				fullName,
				role: invite.role,
				email: invite.email,
				passwordHash,
				pinCodeHash,
				isActive: true,
			})
			.returning();

		await db
			.update(userInvitations)
			.set({ status: "accepted" })
			.where(eq(userInvitations.id, invite.id));

		const staffToken = signToken(
			{
				userId: user.id,
				fullName: user.fullName,
				role: user.role,
				organizationId: user.organizationId,
			},
			TOKEN_SECRET(),
			60 * 60 * 24 * 7,
		);
		return reply.send({
			ok: true,
			staffToken,
			user: {
				id: user.id,
				fullName: user.fullName,
				role: user.role,
				email: user.email,
			},
		});
	},
);
