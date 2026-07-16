(() => {
	var scriptTag =
		document.currentScript ||
		document.querySelector('script[src*="dente-booking.js"]');
	var clinicSlug = scriptTag
		? scriptTag.getAttribute("data-clinic-slug")
		: null;
	var apiUrl = scriptTag
		? scriptTag.getAttribute("data-api-url")
		: "http://127.0.0.1:3000";
	if (!clinicSlug) {
		console.error("DENTE Booking Widget: missing data-clinic-slug attribute.");
		return;
	}
	var style = document.createElement("style");
	style.innerHTML = `
    #dente-booking-btn {
      position: fixed; bottom: 20px; right: 20px; background: #4f46e5; color: white;
      border: none; border-radius: 50px; padding: 14px 24px; font-size: 16px;
      font-family: sans-serif; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999; transition: transform 0.2s;
    }
    #dente-booking-btn:hover { transform: scale(1.05); }
    #dente-booking-modal {
      display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); z-index: 1000000; align-items: center;
      justify-content: center; font-family: sans-serif;
    }
    .dente-modal-content {
      background: white; padding: 24px; border-radius: 12px; width: 90%;
      max-width: 400px; position: relative;
    }
    .dente-close { position: absolute; top: 16px; right: 16px; cursor: pointer; font-size: 24px; color: #999; }
    .dente-form-group { margin-bottom: 16px; }
    .dente-form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #333; }
    .dente-form-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
    .dente-submit { width: 100%; background: #4f46e5; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 16px; cursor: pointer; }
    .dente-submit:disabled { background: #999; cursor: not-allowed; }
    #dente-booking-success { display: none; text-align: center; color: #10b981; }
  `;
	document.head.appendChild(style);
	var container = document.createElement("div");
	container.innerHTML = `
    <button id="dente-booking-btn">Записаться онлайн</button>
    <div id="dente-booking-modal">
      <div class="dente-modal-content">
        <span class="dente-close">&times;</span>
        <h3 style="margin-top:0;">Онлайн-запись</h3>
        <div id="dente-booking-form">
          <div class="dente-form-group"><label>Имя</label><input type="text" id="dente-name" required></div>
          <div class="dente-form-group"><label>Телефон</label><input type="tel" id="dente-phone" required></div>
          <div class="dente-form-group"><label>Дата</label><input type="date" id="dente-date" required></div>
          <button class="dente-submit" id="dente-submit-btn">Отправить заявку</button>
        </div>
        <div id="dente-booking-success">
          <h4 style="margin-bottom:8px;">Заявка принята!</h4>
          <p style="font-size:14px;color:#666;margin:0;">Администратор свяжется с вами.</p>
        </div>
      </div>
    </div>
  `;
	document.body.appendChild(container);
	var btn = document.getElementById("dente-booking-btn");
	var modal = document.getElementById("dente-booking-modal");
	var close = document.querySelector(".dente-close");
	var submitBtn = document.getElementById("dente-submit-btn");
	btn.onclick = () => {
		modal.style.display = "flex";
	};
	close.onclick = () => {
		modal.style.display = "none";
	};
	window.onclick = (e) => {
		if (e.target === modal) modal.style.display = "none";
	};
	submitBtn.onclick = () => {
		var name = document.getElementById("dente-name").value;
		var phone = document.getElementById("dente-phone").value;
		var date = document.getElementById("dente-date").value;
		if (!name || !phone || !date) return alert("Заполните все поля");
		submitBtn.disabled = true;
		submitBtn.innerText = "Отправка...";
		fetch(apiUrl + "/api/public/booking/" + clinicSlug + "/request", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				patientName: name,
				patientPhone: phone,
				requestedDate: date,
			}),
		})
			.then((r) => r.json())
			.then((d) => {
				if (d.error) throw new Error(d.error);
				document.getElementById("dente-booking-form").style.display = "none";
				document.getElementById("dente-booking-success").style.display =
					"block";
			})
			.catch((e) => {
				alert("Ошибка: " + e.message);
				submitBtn.disabled = false;
				submitBtn.innerText = "Отправить заявку";
			});
	};
})();
